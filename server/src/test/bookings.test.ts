// Booking scenarios from docs/acceptance.md.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, BookingsForDate, CreateBookingsResponse, MyBookings } from '@seat/shared';
import {
  book,
  createTestApp,
  FRIDAY,
  THURSDAY,
  TODAY,
  YESTERDAY,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeEach(async () => {
  t = await createTestApp();
});
afterEach(() => t.close());

describe('booking', () => {
  it('A-05 books a free seat for the full day as two slot rows with by = bookedBy', async () => {
    const res = await book(t, 'alice', TODAY, 'A-10');
    expect(res.statusCode).toBe(201);
    expect(t.json<CreateBookingsResponse>(res)).toEqual({
      booked: [{ seat: 'A-10', slots: ['am', 'pm'] }],
      lost: [],
    });

    const day = t.json<BookingsForDate>(
      await t.as('bob', { method: 'GET', url: `/api/bookings?date=${TODAY}` }),
    );
    const rows = day.bookings.filter((b) => b.seat === 'A-10');
    expect(rows.map((b) => b.slot).sort()).toEqual(['am', 'pm']);
    for (const b of rows) {
      expect(b.by).toBe('alice');
      expect(b.bookedBy).toBe('alice');
      expect(b.id).toBe(`${TODAY}_${b.slot}_A-10`);
    }
  });

  it('A-06 exactly one of two concurrent bookings for the same seat/date/slots succeeds', async () => {
    const [a, b] = await Promise.all([
      book(t, 'alice', TODAY, 'A-11'),
      book(t, 'bob', TODAY, 'A-11'),
    ]);
    const statuses = [a.statusCode, b.statusCode].sort();
    // One 201 with the seat booked, one 409 (single-item request that obtained nothing).
    expect(statuses).toEqual([201, 409]);
    const rows = await t.ctx.db.booking.findMany({ where: { date: TODAY, seat: 'A-11' } });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.by)).size).toBe(1);
  });

  it('A-07 cancelling deletes both slot rows and publishes delete events', async () => {
    await book(t, 'alice', TODAY, 'A-12');
    const published: unknown[] = [];
    const orig = t.ctx.bus.publish.bind(t.ctx.bus);
    t.ctx.bus.publish = ((event: string, data: unknown) => {
      published.push({ event, data });
      return (orig as (e: never, d: never) => void)(event as never, data as never);
    }) as typeof t.ctx.bus.publish;

    for (const slot of ['am', 'pm']) {
      const res = await t.as('alice', {
        method: 'DELETE',
        url: `/api/bookings/${TODAY}_${slot}_A-12`,
      });
      expect(res.statusCode).toBe(204);
    }
    expect(await t.ctx.db.booking.count({ where: { date: TODAY, seat: 'A-12' } })).toBe(0);
    expect(published).toEqual([
      { event: 'booking', data: { op: 'delete', id: `${TODAY}_am_A-12` } },
      { event: 'booking', data: { op: 'delete', id: `${TODAY}_pm_A-12` } },
    ]);
  });

  it('A-08 someone else cannot cancel my booking', async () => {
    await book(t, 'alice', TODAY, 'A-13');
    const res = await t.as('bob', { method: 'DELETE', url: `/api/bookings/${TODAY}_am_A-13` });
    expect(res.statusCode).toBe(403);
    expect(t.json<ApiError>(res).error.code).toBe('forbidden');
    expect(await t.ctx.db.booking.count({ where: { id: `${TODAY}_am_A-13` } })).toBe(1);
  });

  it('A-09 a read-only user gets forbidden on write', async () => {
    const res = await book(t, 'dan', TODAY, 'A-14');
    expect(res.statusCode).toBe(403);
    expect(t.json<ApiError>(res).error.code).toBe('forbidden');
  });

  it('A-10 a booking for yesterday is invalid (invariant 6)', async () => {
    const res = await book(t, 'alice', YESTERDAY, 'A-15');
    expect(res.statusCode).toBe(400);
    expect(t.json<ApiError>(res).error.code).toBe('invalid_argument');
  });

  it('A-11 "mine" lists today and later, not yesterday, sorted by date', async () => {
    // Insert a past row directly: the API refuses past dates.
    await t.ctx.db.booking.create({
      data: {
        id: `${YESTERDAY}_am_A-16`,
        date: YESTERDAY,
        slot: 'am',
        seat: 'A-16',
        by: 'alice',
        bookedBy: 'alice',
      },
    });
    await book(t, 'alice', FRIDAY, 'A-18');
    await book(t, 'alice', TODAY, 'A-17');
    const mine = t.json<MyBookings>(
      await t.as('alice', { method: 'GET', url: '/api/bookings/mine' }),
    );
    expect(mine.bookings.some((b) => b.date === YESTERDAY)).toBe(false);
    expect([...new Set(mine.bookings.map((b) => `${b.date}|${b.seat}`))]).toEqual([
      `${TODAY}|A-17`,
      `${FRIDAY}|A-18`,
    ]);
  });

  it('A-04 booking the free half of a partially booked seat (R-7)', async () => {
    await book(t, 'alice', THURSDAY, 'A-19', ['am']);
    const res = await book(t, 'bob', THURSDAY, 'A-19', ['am', 'pm']);
    expect(res.statusCode).toBe(201);
    expect(t.json<CreateBookingsResponse>(res)).toEqual({
      booked: [{ seat: 'A-19', slots: ['pm'] }],
      lost: [],
    });
  });

  it('rejects unknown seats and a seat outside the plan', async () => {
    expect((await book(t, 'alice', TODAY, 'A-99')).statusCode).toBe(400);
    expect((await book(t, 'alice', TODAY, 'Z-01')).statusCode).toBe(400);
  });

  it('requires a session', async () => {
    const res = await t.as(null, { method: 'GET', url: `/api/bookings?date=${TODAY}` });
    expect(res.statusCode).toBe(401);
    expect(t.json<ApiError>(res).error.code).toBe('unauthenticated');
  });
});

describe('team booking', () => {
  it('A-15 colleague seats are by the colleague, labelled seats are held by the booker', async () => {
    const res = await t.as('alice', {
      method: 'POST',
      url: '/api/bookings',
      payload: {
        date: TODAY,
        slots: ['am', 'pm'],
        items: [{ seat: 'A-20' }, { seat: 'A-21', by: 'bob' }, { seat: 'A-22', label: 'Guest' }],
      },
    });
    expect(res.statusCode).toBe(201);
    const byId = (id: string) => t.ctx.db.booking.findUniqueOrThrow({ where: { id } });
    const s1 = await byId(`${TODAY}_am_A-20`);
    expect([s1.by, s1.bookedBy, s1.label]).toEqual(['alice', 'alice', null]);
    const s2 = await byId(`${TODAY}_am_A-21`);
    expect([s2.by, s2.bookedBy, s2.label]).toEqual(['bob', 'alice', null]);
    const s3 = await byId(`${TODAY}_am_A-22`);
    expect([s3.by, s3.bookedBy, s3.label]).toEqual(['alice', 'alice', 'Guest']);
    const bobsList = t.json<MyBookings>(
      await t.as('bob', { method: 'GET', url: '/api/bookings/mine' }),
    );
    expect(bobsList.bookings.map((b) => b.seat)).toContain('A-21');
    // Bob may cancel a seat booked for him (R-8).
    expect(
      (await t.as('bob', { method: 'DELETE', url: `/api/bookings/${TODAY}_am_A-21` })).statusCode,
    ).toBe(204);
  });

  it('A-16 a seat taken moments earlier is reported lost, the rest are booked (R-17)', async () => {
    await book(t, 'bob', TODAY, 'A-24');
    const res = await t.as('alice', {
      method: 'POST',
      url: '/api/bookings',
      payload: {
        date: TODAY,
        slots: ['am', 'pm'],
        items: [{ seat: 'A-23' }, { seat: 'A-24' }, { seat: 'A-25' }],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = t.json<CreateBookingsResponse>(res);
    expect(body.lost).toEqual(['A-24']);
    expect(body.booked.map((b) => b.seat)).toEqual(['A-23', 'A-25']);
  });

  it('A-17 a label together with a colleague is invalid (invariant 7)', async () => {
    const res = await t.as('alice', {
      method: 'POST',
      url: '/api/bookings',
      payload: { date: TODAY, slots: ['am'], items: [{ seat: 'A-26', by: 'bob', label: 'Guest' }] },
    });
    expect(res.statusCode).toBe(400);
    expect(await t.ctx.db.booking.count()).toBe(0);
  });
});
