// Domain vocabulary and API shapes. Source: docs/domain-model.md, docs/api.md.

/** `am` or `pm`. A full day is both. There is no `day` slot in storage (R-9). */
export type Slot = 'am' | 'pm';
export const ALL_SLOTS: readonly Slot[] = ['am', 'pm'];

/** East or west half of the floor, split by the red divider (O-12). */
export type Part = 'east' | 'west';

/** Calendar date `YYYY-MM-DD` in the office time zone (R-30). */
export type IsoDate = string;

/** Booking entity (domain-model.md). Natural key `(date, slot, seat)`. */
export interface Booking {
  /** `date_slot_seat`, the natural key, so clients can address rows without a lookup. */
  id: string;
  date: IsoDate;
  slot: Slot;
  seat: string;
  /** The occupant. */
  by: string;
  /** Who made the booking. Equals `by` unless booked for a colleague (R-16). */
  bookedBy: string;
  /** Free-text occupant for a seat held for a team (R-16). Only when `by == bookedBy`. */
  label?: string | null;
  createdAt: string;
}

/** Dedication entity. At most one owner per seat (R-18). */
export interface Dedication {
  seat: string;
  owner: string;
}

/** Release entity: a dedicated seat opened up for one date (R-20, decision 0002). */
export interface Release {
  date: IsoDate;
  seat: string;
  by: string;
}

/** Open-question switches, per user, kept in the browser (decisions 0001, 0002, 0003). */
export interface Settings {
  slotSize: 'day' | 'half';
  area: 'east' | 'all';
  dedRule: 'release' | 'locked';
}
export const DEFAULT_SETTINGS: Settings = { slotSize: 'day', area: 'east', dedRule: 'release' };

/** Seat status, evaluated top to bottom (domain-model.md, Seat status). */
export type SeatStatus = 'off' | 'dedmine' | 'ded' | 'mine' | 'free' | 'partial' | 'taken';

export const STATUS_TEXT: Record<SeatStatus, string> = {
  free: 'Free',
  mine: 'Booked by you',
  taken: 'Taken',
  partial: 'Half taken',
  ded: 'Dedicated',
  dedmine: 'Your dedicated seat',
  off: 'Not bookable',
};

/** GET /api/me */
export interface Me {
  id: string;
  name: string;
  avatarUrl: string;
  canWrite: boolean;
  isAdmin: boolean;
  /** IANA office time zone from server configuration (R-30); the client never hard-codes it. */
  officeTz: string;
}

/** GET /api/users, POST /api/users/resolve */
export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  isMe?: boolean;
}

/** GET /api/bookings?date= */
export interface BookingsForDate {
  bookings: Booking[];
  releases: Release[];
}

/** GET /api/bookings/mine */
export interface MyBookings {
  bookings: Booking[];
  dedications: Dedication[];
}

/** POST /api/bookings */
export interface CreateBookingsRequest {
  date: IsoDate;
  slots: Slot[];
  items: Array<{ seat: string; by?: string; label?: string }>;
}
export interface CreateBookingsResponse {
  booked: Array<{ seat: string; slots: Slot[] }>;
  lost: string[];
}

/** Error envelope (api.md). */
export type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invalid_argument'
  | 'quota_exceeded';
export interface ApiError {
  error: { code: ApiErrorCode; message: string };
}

/** Server-Sent Events payloads (api.md, R-26). */
export type BookingEvent =
  { op: 'set'; id: string; booking: Booking } | { op: 'delete'; id: string };
export type ReleaseEvent =
  | { op: 'set'; date: IsoDate; seat: string; release: Release }
  | { op: 'delete'; date: IsoDate; seat: string };
export type DedicationEvent =
  { op: 'set'; seat: string; dedication: Dedication } | { op: 'delete'; seat: string };

/** Sentinel user id for simulated fixture bookings (domain-model.md, Display names). */
export const SIM_USER = 'sim';

export function bookingId(date: IsoDate, slot: Slot, seat: string): string {
  return `${date}_${slot}_${seat}`;
}
