// Shared test harness for docs/acceptance.md client scenarios: fixture users (alice, bob,
// carol = admin, dan = read-only), a `fetch` mock that speaks docs/api.md, a stub
// EventSource, and a reset of the store so each test starts from the "frozen Wednesday".
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { bookingId, loadFloorPlan } from '@seat/shared';
import type { Booking, Dedication, IsoDate, Me, Release, Slot, UserProfile } from '@seat/shared';
import rawPlan from '../../../docs/floor-plan.json';
import { App } from '../App';
import { disconnectEvents } from '../events';
import { initialData, useStore } from '../store';

/** "Today" is frozen to a Wednesday in the office time zone (acceptance.md Fixtures). */
export const TODAY: IsoDate = '2026-10-14';
export const YESTERDAY: IsoDate = '2026-10-13';
export const FRIDAY: IsoDate = '2026-10-16';
export const FROZEN_NOW = new Date('2026-10-14T09:00:00Z');

/** The real plan from docs/floor-plan.json (C-2), validated like the client does. */
export const PLAN = loadFloorPlan(rawPlan);

export const USERS: Record<'alice' | 'bob' | 'carol' | 'dan', UserProfile> = {
  alice: { id: 'alice', name: 'Alice Andersen', avatarUrl: 'https://example.test/alice.png' },
  bob: { id: 'bob', name: 'Bob Berg', avatarUrl: 'https://example.test/bob.png' },
  carol: { id: 'carol', name: 'Carol Chen', avatarUrl: 'https://example.test/carol.png' },
  dan: { id: 'dan', name: 'Dan Dahl', avatarUrl: 'https://example.test/dan.png' },
};

export function meAs(id: keyof typeof USERS): Me {
  return {
    ...USERS[id],
    canWrite: id !== 'dan',
    isAdmin: id === 'carol',
  };
}

export function mkBooking(
  date: IsoDate,
  slot: Slot,
  seat: string,
  by: string,
  extra: Partial<Pick<Booking, 'bookedBy' | 'label'>> = {},
): Booking {
  return {
    id: bookingId(date, slot, seat),
    date,
    slot,
    seat,
    by,
    bookedBy: extra.bookedBy ?? by,
    label: extra.label ?? null,
    createdAt: '2026-10-13T08:00:00Z',
  };
}

export interface MockDb {
  me: Me | null;
  bookings: Booking[];
  releases: Release[];
  dedications: Dedication[];
}

export interface MockReply {
  status: number;
  body?: unknown;
}

export interface Call {
  method: string;
  path: string;
  body: unknown;
}

export type Override = (method: string, url: URL, body: unknown) => MockReply | undefined;

function reply(r: MockReply): Response {
  return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
    status: r.status,
    headers: { 'content-type': 'application/json' },
  });
}

const err = (status: number, code: string): MockReply => ({
  status,
  body: { error: { code, message: code } },
});

/** Install a `fetch` that answers the api.md routes from `db`; `override` wins when it returns. */
export function installMockApi(db: MockDb, override?: Override): { calls: Call[] } {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
    calls.push({ method, path: url.pathname + url.search, body });

    const o = override?.(method, url, body);
    if (o) return reply(o);

    const p = url.pathname;
    if (p === '/api/me')
      return reply(db.me ? { status: 200, body: db.me } : err(401, 'unauthenticated'));
    if (p === '/api/dev/users') return reply({ status: 200, body: Object.values(USERS) });
    if (p === '/api/dev/login' || p === '/api/dev/logout') return reply({ status: 204 });
    if (p === '/api/floor-plan') return reply({ status: 200, body: rawPlan });
    if (p === '/api/dedications' && method === 'GET')
      return reply({ status: 200, body: db.dedications });
    if (p === '/api/bookings/mine') {
      const me = db.me?.id;
      return reply({
        status: 200,
        body: {
          bookings: db.bookings.filter((b) => b.by === me),
          dedications: db.dedications.filter((d) => d.owner === me),
        },
      });
    }
    if (p === '/api/bookings' && method === 'GET') {
      const date = url.searchParams.get('date');
      return reply({
        status: 200,
        body: {
          bookings: db.bookings.filter((b) => b.date === date),
          releases: db.releases.filter((r) => r.date === date),
        },
      });
    }
    if (p === '/api/bookings' && method === 'POST') {
      const req = body as {
        date: IsoDate;
        slots: Slot[];
        items: Array<{ seat: string; by?: string; label?: string }>;
      };
      const booked: Array<{ seat: string; slots: Slot[] }> = [];
      const lost: string[] = [];
      for (const it of req.items) {
        const got: Slot[] = [];
        for (const sl of req.slots) {
          const id = bookingId(req.date, sl, it.seat);
          if (db.bookings.some((b) => b.id === id)) continue;
          db.bookings.push(
            mkBooking(req.date, sl, it.seat, it.by ?? db.me!.id, {
              bookedBy: db.me!.id,
              label: it.label ?? null,
            }),
          );
          got.push(sl);
        }
        if (got.length) booked.push({ seat: it.seat, slots: got });
        else lost.push(it.seat);
      }
      if (req.items.length === 1 && lost.length === 1) return reply(err(409, 'conflict'));
      return reply({ status: 200, body: { booked, lost } });
    }
    if (p.startsWith('/api/bookings/') && method === 'DELETE') {
      const id = decodeURIComponent(p.slice('/api/bookings/'.length));
      db.bookings = db.bookings.filter((b) => b.id !== id);
      return reply({ status: 204 });
    }
    if (p === '/api/users/resolve') {
      const ids = (body as { ids: string[] }).ids;
      const out: Record<string, UserProfile> = {};
      for (const u of Object.values(USERS)) if (ids.includes(u.id)) out[u.id] = u;
      return reply({ status: 200, body: out });
    }
    if (p === '/api/users') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const hits = Object.values(USERS)
        .filter((u) => u.name.toLowerCase().includes(q))
        .map((u) => ({ ...u, isMe: u.id === db.me?.id }));
      return reply({ status: 200, body: hits });
    }
    return reply(err(404, 'not_found'));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls };
}

/** Minimal EventSource stand-in: records instances and lets tests emit named events. */
export class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  private listeners = new Map<string, Set<(ev: Event) => void>>();
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (ev: Event) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn);
  }
  removeEventListener(type: string, fn: (ev: Event) => void): void {
    this.listeners.get(type)?.delete(fn);
  }
  close(): void {
    this.listeners.clear();
  }
  emit(type: string, data: unknown): void {
    const ev = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const fn of this.listeners.get(type) ?? []) fn(ev);
  }
}

/** Freeze the clock, reset the store and install the mocks. Call in `beforeEach`. */
export function setupScenario(db: MockDb, override?: Override): { calls: Call[] } {
  vi.setSystemTime(FROZEN_NOW);
  localStorage.clear();
  disconnectEvents();
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  useStore.setState(initialData());
  return installMockApi(db, override);
}

export function teardownScenario(): void {
  disconnectEvents();
  vi.unstubAllGlobals();
  vi.useRealTimers();
}

/** Render the app and wait for the map to be on screen. */
export async function renderApp(): Promise<void> {
  render(createElement(App));
  await screen.findByTestId('stats');
}
