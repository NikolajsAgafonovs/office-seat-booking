// Dedicated seat scenarios from docs/acceptance.md (R-18 to R-21, decisions 0002, 0004).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiError, BookingsForDate, Dedication, MyBookings } from '@seat/shared';
import { book, createTestApp, FRIDAY, THURSDAY, type TestApp } from './helpers.js';

let t: TestApp;
beforeEach(async () => {
  t = await createTestApp();
});
afterEach(() => t.close());

const dedicate = (seat: string, owner: string, user = 'carol') =>
  t.as(user, { method: 'PUT', url: `/api/dedications/${seat}`, payload: { owner } });

describe('dedications', () => {
  it('A-18 an admin dedicates a seat; it appears in the owner\'s "mine" response', async () => {
    const res = await dedicate('A-20', 'alice');
    expect(res.statusCode).toBe(200);
    expect(t.json<Dedication>(res)).toEqual({ seat: 'A-20', owner: 'alice' });
    const all = t.json<Dedication[]>(await t.as('bob', { method: 'GET', url: '/api/dedications' }));
    expect(all).toEqual([{ seat: 'A-20', owner: 'alice' }]);
    const mine = t.json<MyBookings>(
      await t.as('alice', { method: 'GET', url: '/api/bookings/mine' }),
    );
    expect(mine.dedications).toEqual([{ seat: 'A-20', owner: 'alice' }]);
  });

  it('A-19 a non-admin cannot dedicate', async () => {
    const res = await dedicate('A-20', 'alice', 'bob');
    expect(res.statusCode).toBe(403);
    expect(t.json<ApiError>(res).error.code).toBe('forbidden');
  });

  it('A-20 nobody else can book a dedicated seat (invariant 3)', async () => {
    await dedicate('A-20', 'alice');
    const res = await book(t, 'bob', THURSDAY, 'A-20');
    expect(res.statusCode).toBe(409);
    expect(t.json<ApiError>(res).error.code).toBe('conflict');
    // The owner can.
    expect((await book(t, 'alice', THURSDAY, 'A-20')).statusCode).toBe(201);
  });

  it('A-21 releasing for Friday makes the seat bookable by others on Friday only', async () => {
    await dedicate('A-20', 'alice');
    const rel = await t.as('alice', { method: 'PUT', url: `/api/releases/${FRIDAY}/A-20` });
    expect(rel.statusCode).toBe(204);
    const friday = t.json<BookingsForDate>(
      await t.as('bob', { method: 'GET', url: `/api/bookings?date=${FRIDAY}` }),
    );
    expect(friday.releases).toEqual([{ date: FRIDAY, seat: 'A-20', by: 'alice' }]);
    expect((await book(t, 'bob', FRIDAY, 'A-20')).statusCode).toBe(201);
    expect((await book(t, 'bob', THURSDAY, 'A-20')).statusCode).toBe(409);
  });

  it('A-22 the owner cannot take the seat back while someone else holds it', async () => {
    await dedicate('A-20', 'alice');
    await t.as('alice', { method: 'PUT', url: `/api/releases/${FRIDAY}/A-20` });
    await book(t, 'bob', FRIDAY, 'A-20');
    const res = await t.as('alice', { method: 'DELETE', url: `/api/releases/${FRIDAY}/A-20` });
    expect(res.statusCode).toBe(409);
    // After bob cancels, the owner can take it back.
    await t.as('bob', { method: 'DELETE', url: `/api/bookings/${FRIDAY}_am_A-20` });
    await t.as('bob', { method: 'DELETE', url: `/api/bookings/${FRIDAY}_pm_A-20` });
    expect(
      (await t.as('alice', { method: 'DELETE', url: `/api/releases/${FRIDAY}/A-20` })).statusCode,
    ).toBe(204);
  });

  it('only the owner can release (invariant 4)', async () => {
    await dedicate('A-20', 'alice');
    expect(
      (await t.as('bob', { method: 'PUT', url: `/api/releases/${FRIDAY}/A-20` })).statusCode,
    ).toBe(403);
    expect(
      (await t.as('alice', { method: 'PUT', url: `/api/releases/${FRIDAY}/A-21` })).statusCode,
    ).toBe(403);
  });

  it('A-24 removing the dedication makes the seat bookable again', async () => {
    await dedicate('A-20', 'alice');
    expect(
      (await t.as('carol', { method: 'DELETE', url: '/api/dedications/A-20' })).statusCode,
    ).toBe(204);
    expect((await book(t, 'bob', THURSDAY, 'A-20')).statusCode).toBe(201);
  });

  it('rejects unknown seats and unknown owners', async () => {
    expect((await dedicate('A-99', 'alice')).statusCode).toBe(404);
    expect((await dedicate('A-20', 'nobody')).statusCode).toBe(400);
  });
});
