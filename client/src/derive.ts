// Per-render derivation of seat statuses and counts from store data, using the shared
// status table (docs/domain-model.md "Seat status", R-3, R-5). Nothing here reimplements
// the table; it only feeds `computeStatus` and tallies the result.
import { computeStatus, indexBookings, slotsFor } from '@seat/shared';
import type {
  Booking,
  Dedication,
  IndexedFloorPlan,
  Release,
  SeatStatus,
  Settings,
  Slot,
} from '@seat/shared';
import type { SlotChoice } from './format';

export interface Counts {
  free: number;
  taken: number;
  dedicated: number;
  bookable: number;
}

export interface Derived {
  slots: readonly Slot[];
  bookingsBySeat: ReadonlyMap<string, readonly Booking[]>;
  status: ReadonlyMap<string, SeatStatus>;
  counts: Counts;
}

export interface DeriveInput {
  plan: IndexedFloorPlan | null;
  meId: string | null;
  settings: Settings;
  slot: SlotChoice;
  dayBookings: Record<string, Booking>;
  dedications: Record<string, Dedication>;
  releases: Record<string, Release>;
}

export function derive(input: DeriveInput): Derived {
  const slots = slotsFor(input.settings.slotSize, input.slot);
  const bookingsBySeat = indexBookings(Object.values(input.dayBookings), slots);
  const dedications = new Map(Object.entries(input.dedications));
  const releasedSeats = new Set(Object.keys(input.releases));
  const status = new Map<string, SeatStatus>();
  const counts: Counts = { free: 0, taken: 0, dedicated: 0, bookable: 0 };
  if (input.plan) {
    const ctx = {
      meId: input.meId,
      settings: input.settings,
      slots,
      bookingsBySeat,
      dedications,
      releasedSeats,
    };
    for (const seat of input.plan.seats) {
      const st = computeStatus(seat, ctx);
      status.set(seat.id, st);
      // R-5: "off" seats are excluded from every count; "taken" includes the user's own.
      if (st === 'off') continue;
      counts.bookable++;
      if (st === 'free') counts.free++;
      else if (st === 'ded' || st === 'dedmine') counts.dedicated++;
      else counts.taken++;
    }
  }
  return { slots, bookingsBySeat, status, counts };
}
