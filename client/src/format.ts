// User-facing texts from docs/ui.md "Feedback texts" and the seat card wording.
import { formatLong } from '@seat/shared';
import type { IsoDate, Slot } from '@seat/shared';

export type SlotChoice = Slot | 'day';

/** ", morning" / ", afternoon" / ", full day" for the seat card "When" row (R-4). */
export function slotSuffix(slot: SlotChoice): string {
  return slot === 'am' ? ', morning' : slot === 'pm' ? ', afternoon' : ', full day';
}

/** " · morning" / " · afternoon" / "" for the map title. */
export function slotTitleSuffix(slot: SlotChoice): string {
  return slot === 'am' ? ' · morning' : slot === 'pm' ? ' · afternoon' : '';
}

/** "(morning)" / "(afternoon)" for per-half occupant lists. */
export function halfName(slot: Slot): string {
  return slot === 'am' ? 'morning' : 'afternoon';
}

export const TEXT = {
  bookedOne: (seat: string, date: IsoDate) => `Booked ${seat} for ${formatLong(date)}`,
  bookedMany: (n: number, date: IsoDate) => `Booked ${n} seats for ${formatLong(date)}`,
  lost: (seats: readonly string[]) =>
    `${seats.join(', ')} ${seats.length > 1 ? 'were' : 'was'} just taken by someone else. Pick another seat.`,
  cancelled: (seat: string, date: IsoDate) => `Cancelled ${seat} on ${formatLong(date)}`,
  released: (seat: string, date: IsoDate) => `Released ${seat} for ${formatLong(date)}`,
  takenBack: (seat: string) => `Seat ${seat} is yours again`,
  dedicated: (seat: string, name: string) => `${seat} is now dedicated to ${name}`,
  undedicated: (seat: string) => `${seat} is bookable again`,
  noGroup: (n: number) =>
    `No group of ${n} free seats together on this day. Try another day or fewer people.`,
  foundGroup: (n: number, first: string, last: string) =>
    `Found ${n} seats together: ${first} to ${last}`,
  offSeat: (seat: string) => `${seat} is outside the bookable part in this setting (O-12).`,
  forbidden: 'This page is read-only for you, so the booking was not saved.',
  quota: 'Storage is full. Cancel some old bookings and try again.',
  otherError: 'Could not save. Check your connection and try again.',
  takeBackBlocked: 'Someone else holds a booking for that seat today, so it cannot be taken back.',
} as const;
