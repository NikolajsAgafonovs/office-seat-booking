// Seat status table (docs/domain-model.md) and slot helpers.
import { describe, expect, it } from 'vitest';
import type { Booking, Settings } from './types.js';
import { DEFAULT_SETTINGS } from './types.js';
import { computeStatus, indexBookings, slotsFor, type StatusContext } from './status.js';

const east = { id: 'A-01', part: 'east' as const };
const west = { id: 'B-01', part: 'west' as const };

function booking(seat: string, slot: 'am' | 'pm', by: string): Booking {
  return {
    id: `2026-10-14_${slot}_${seat}`,
    date: '2026-10-14',
    slot,
    seat,
    by,
    bookedBy: by,
    createdAt: '',
  };
}

type CtxOverrides = Partial<Omit<StatusContext, 'settings'>> & { settings?: Partial<Settings> };

function ctx(partial: CtxOverrides = {}): StatusContext {
  const { settings, ...rest } = partial;
  return {
    meId: 'alice',
    slots: ['am', 'pm'],
    bookingsBySeat: new Map(),
    dedications: new Map(),
    releasedSeats: new Set(),
    ...rest,
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
  };
}

describe('computeStatus', () => {
  it('A-02 west seats are off under the east setting and ordinary under all', () => {
    expect(computeStatus(west, ctx())).toBe('off');
    expect(computeStatus(west, ctx({ settings: { area: 'all' } }))).toBe('free');
  });

  it('A-03 taken for others, mine for the occupant', () => {
    const bs = indexBookings(
      [booking('A-01', 'am', 'alice'), booking('A-01', 'pm', 'alice')],
      ['am', 'pm'],
    );
    expect(computeStatus(east, ctx({ bookingsBySeat: bs }))).toBe('mine');
    expect(computeStatus(east, ctx({ bookingsBySeat: bs, meId: 'bob' }))).toBe('taken');
  });

  it('A-04 half taken for a full-day view, taken/free for the matching half', () => {
    const am = [booking('A-01', 'am', 'alice')];
    expect(
      computeStatus(east, ctx({ meId: 'bob', bookingsBySeat: indexBookings(am, ['am', 'pm']) })),
    ).toBe('partial');
    expect(
      computeStatus(
        east,
        ctx({ meId: 'bob', slots: ['am'], bookingsBySeat: indexBookings(am, ['am']) }),
      ),
    ).toBe('taken');
    expect(
      computeStatus(
        east,
        ctx({ meId: 'bob', slots: ['pm'], bookingsBySeat: indexBookings(am, ['pm']) }),
      ),
    ).toBe('free');
  });

  it('A-18 dedicated seats: dedmine for the owner, ded for others, on every day', () => {
    const ded = new Map([['A-01', { seat: 'A-01', owner: 'alice' }]]);
    expect(computeStatus(east, ctx({ dedications: ded }))).toBe('dedmine');
    expect(computeStatus(east, ctx({ dedications: ded, meId: 'bob' }))).toBe('ded');
  });

  it('A-21 a released dedicated seat behaves like a free seat under the release rule only', () => {
    const ded = new Map([['A-01', { seat: 'A-01', owner: 'alice' }]]);
    const rel = new Set(['A-01']);
    expect(computeStatus(east, ctx({ dedications: ded, releasedSeats: rel, meId: 'bob' }))).toBe(
      'free',
    );
    expect(
      computeStatus(
        east,
        ctx({ dedications: ded, releasedSeats: rel, meId: 'bob', settings: { dedRule: 'locked' } }),
      ),
    ).toBe('ded');
  });

  it('dedication outranks bookings; off outranks dedication', () => {
    const ded = new Map([['A-01', { seat: 'A-01', owner: 'alice' }]]);
    const bs = indexBookings([booking('A-01', 'am', 'alice')], ['am', 'pm']);
    expect(computeStatus(east, ctx({ dedications: ded, bookingsBySeat: bs }))).toBe('dedmine');
    expect(
      computeStatus(
        west,
        ctx({ dedications: new Map([['B-01', { seat: 'B-01', owner: 'alice' }]]) }),
      ),
    ).toBe('off');
  });
});

describe('slotsFor (decision 0001)', () => {
  it('full days cover both slots; half days cover the chosen one', () => {
    expect(slotsFor('day', 'am')).toEqual(['am', 'pm']);
    expect(slotsFor('half', 'day')).toEqual(['am', 'pm']);
    expect(slotsFor('half', 'pm')).toEqual(['pm']);
  });
});
