// Identity, floor plan, live updates, time zone and seed scenarios.
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FloorPlan, Me, UserProfile } from '@seat/shared';
import { SIM_USER } from '@seat/shared';
import { EventBus } from '../events.js';
import { seed } from '../seed.js';
import { book, createTestApp, FIXTURE_PATH, TODAY, WEDNESDAY, type TestApp } from './helpers.js';

let t: TestApp;
beforeEach(async () => {
  t = await createTestApp();
});
afterEach(() => t.close());

describe('identity (R-22 to R-25, decision 0007)', () => {
  it('GET /api/me returns identity and permissions from configuration', async () => {
    expect(t.json<Me>(await t.as('carol', { method: 'GET', url: '/api/me' }))).toMatchObject({
      id: 'carol',
      canWrite: true,
      isAdmin: true,
    });
    expect(t.json<Me>(await t.as('dan', { method: 'GET', url: '/api/me' }))).toMatchObject({
      canWrite: false,
      isAdmin: false,
    });
    expect((await t.as(null, { method: 'GET', url: '/api/me' })).statusCode).toBe(401);
  });

  it('dev login sets a session cookie that /api/me accepts', async () => {
    const login = await t.as(null, {
      method: 'POST',
      url: '/api/dev/login',
      payload: { id: 'bob' },
    });
    expect(login.statusCode).toBe(204);
    const cookie = login.cookies.find((c) => c.name === 'seat_session');
    expect(cookie).toBeDefined();
    const me = await t.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `seat_session=${cookie!.value}` },
    });
    expect(t.json<Me>(me).id).toBe('bob');
  });

  it('R-24 directory search returns at most 10 and marks me', async () => {
    const hits = t.json<UserProfile[]>(
      await t.as('alice', { method: 'GET', url: '/api/users?q=a' }),
    );
    expect(hits.length).toBeLessThanOrEqual(10);
    expect(hits.find((h) => h.id === 'alice')?.isMe).toBe(true);
    expect(hits.find((h) => h.id === 'carol')?.isMe).toBe(false);
    expect(
      t.json<UserProfile[]>(await t.as('alice', { method: 'GET', url: '/api/users?q=' })),
    ).toEqual([]);
  });

  it('resolve omits unknown ids', async () => {
    const res = await t.as('alice', {
      method: 'POST',
      url: '/api/users/resolve',
      payload: { ids: ['bob', 'ghost'] },
    });
    const map = t.json<Record<string, UserProfile>>(res);
    expect(Object.keys(map)).toEqual(['bob']);
  });
});

describe('floor plan (R-1, C-2)', () => {
  it('serves the documented plan with 168 seats', async () => {
    const plan = t.json<FloorPlan>(await t.as('alice', { method: 'GET', url: '/api/floor-plan' }));
    expect(plan.seats).toHaveLength(168);
    expect(plan.seats.filter((s) => s.part === 'east')).toHaveLength(92);
    expect(plan.viewBox).toBe('70 52 1320 470');
  });
});

describe('live updates (R-26)', () => {
  function fakeResponse() {
    const chunks: string[] = [];
    const res = Object.assign(new EventEmitter(), {
      writableEnded: false,
      destroyed: false,
      writeHead: () => res,
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
      end: () => {
        res.writableEnded = true;
      },
    });
    return { res: res as unknown as ServerResponse, chunks };
  }

  it('A-25 a booking made by one user reaches every attached client as an event', async () => {
    const { res, chunks } = fakeResponse();
    t.ctx.bus.attach(res, 60_000);
    await book(t, 'alice', TODAY, 'A-30', ['am']);
    const frame = chunks.find((c) => c.includes('event: booking'));
    expect(frame).toBeDefined();
    const data = JSON.parse(frame!.split('data: ')[1]!.trim()) as { op: string; id: string };
    expect(data).toMatchObject({ op: 'set', id: `${TODAY}_am_A-30` });
    res.emit('close');
    expect(t.ctx.bus.size).toBe(0);
  });

  it('EventBus drops ended clients', () => {
    const bus = new EventBus();
    const { res } = fakeResponse();
    bus.attach(res, 60_000);
    (res as unknown as { writableEnded: boolean }).writableEnded = true;
    bus.publish('dedication', { op: 'delete', seat: 'A-01' });
    expect(bus.size).toBe(0);
  });

  it('GET /api/events needs a session', async () => {
    expect((await t.as(null, { method: 'GET', url: '/api/events' })).statusCode).toBe(401);
  });
});

describe('time zone (R-30)', () => {
  it('A-29 at 01:30 Riga time "today" is the Riga date even though UTC is still yesterday', async () => {
    await t.close();
    t = await createTestApp({ now: () => new Date('2026-10-14T01:30:00+03:00') }); // 2026-10-13T22:30Z
    const res = await book(t, 'alice', TODAY, 'A-31');
    expect(res.statusCode).toBe(201);
    const row = await t.ctx.db.booking.findUniqueOrThrow({ where: { id: `${TODAY}_am_A-31` } });
    expect(row.date).toBe(TODAY);
  });
});

describe('seed (decision 0008)', () => {
  it('loads the fixture as simulated bookings, idempotently, without touching real rows', async () => {
    await book(t, 'alice', TODAY, 'A-32'); // fixture also wants A-32 on day 0
    const n1 = await seed(t.ctx.db, 'Europe/Riga', FIXTURE_PATH, WEDNESDAY);
    const simCount = await t.ctx.db.booking.count({ where: { by: SIM_USER } });
    expect(n1).toBe(simCount);
    expect(n1).toBeGreaterThan(100);
    const n2 = await seed(t.ctx.db, 'Europe/Riga', FIXTURE_PATH, WEDNESDAY);
    expect(n2).toBe(n1);
    const alice = await t.ctx.db.booking.findMany({ where: { seat: 'A-32', date: TODAY } });
    expect(alice.every((r) => r.by === 'alice')).toBe(true);
    const anyWeekend = (await t.ctx.db.booking.findMany({ where: { by: SIM_USER } })).some((r) => {
      const d = new Date(`${r.date}T12:00:00Z`).getUTCDay();
      return d === 0 || d === 6;
    });
    expect(anyWeekend).toBe(false);
  });
});
