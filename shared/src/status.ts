// Seat status derivation. Source: docs/domain-model.md, "Seat status" table.
// Shared so the server's invariant checks and the client's colouring agree.
import type { Booking, Dedication, Seat, SeatStatus, Settings, Slot } from './index.js';
import { ALL_SLOTS } from './types.js';

export interface StatusContext {
  /** Current user id, or null when not signed in. */
  meId: string | null;
  /** The switches (decisions 0001, 0002, 0003). */
  settings: Settings;
  /** The slots under consideration: both for a full day, else the single chosen slot. */
  slots: readonly Slot[];
  /** Bookings for the chosen date, keyed by seat, already filtered to `slots`. */
  bookingsBySeat: ReadonlyMap<string, readonly Booking[]>;
  /** All dedications, keyed by seat. */
  dedications: ReadonlyMap<string, Dedication>;
  /** Seats released for the chosen date. */
  releasedSeats: ReadonlySet<string>;
}

/** Which slots a full-day or half-day selection covers (R-9, decision 0001). */
export function slotsFor(slotSize: Settings['slotSize'], slot: Slot | 'day'): readonly Slot[] {
  return slotSize === 'day' || slot === 'day' ? ALL_SLOTS : [slot];
}

/** Group a date's bookings by seat, keeping only those in `slots`. */
export function indexBookings(
  bookings: readonly Booking[],
  slots: readonly Slot[],
): Map<string, Booking[]> {
  const m = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (!slots.includes(b.slot)) continue;
    const arr = m.get(b.seat);
    if (arr) arr.push(b);
    else m.set(b.seat, [b]);
  }
  return m;
}

/** Evaluate the status table top to bottom; first match wins. */
export function computeStatus(seat: Pick<Seat, 'id' | 'part'>, ctx: StatusContext): SeatStatus {
  // 1. Outside the bookable area (decision 0003).
  if (ctx.settings.area === 'east' && seat.part !== 'east') return 'off';

  // 2–3. Dedicated and not released for this date (decision 0002).
  const ded = ctx.dedications.get(seat.id);
  if (ded) {
    const released = ctx.settings.dedRule === 'release' && ctx.releasedSeats.has(seat.id);
    if (!released) return ded.owner === ctx.meId ? 'dedmine' : 'ded';
  }

  const bs = ctx.bookingsBySeat.get(seat.id) ?? [];
  // 4. Mine.
  if (ctx.meId && bs.some((b) => b.by === ctx.meId)) return 'mine';
  // 5. Free.
  if (bs.length === 0) return 'free';
  // 6. Half taken (R-7).
  if (bs.length < ctx.slots.length) return 'partial';
  // 7. Taken.
  return 'taken';
}

/** Statuses a booking request may target (R-7). */
export function isBookable(status: SeatStatus): boolean {
  return status === 'free' || status === 'partial';
}
