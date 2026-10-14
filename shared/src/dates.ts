// Calendar-date helpers in the office time zone (R-30). All arithmetic is done on
// UTC-noon anchored dates so daylight-saving changes cannot shift a day.
import type { IsoDate } from './types.js';

export const DEFAULT_OFFICE_TZ = 'Europe/Riga';

/** Calendar date of `instant` as seen in `tz`. */
export function isoDateIn(instant: Date, tz: string): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayIso(tz: string, now: Date = new Date()): IsoDate {
  return isoDateIn(now, tz);
}

/** Parse an ISO date to a UTC-noon Date, safe for day arithmetic. */
export function toUtcNoon(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function fromUtcNoon(d: Date): IsoDate {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  const d = toUtcNoon(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtcNoon(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(iso: IsoDate): number {
  return toUtcNoon(iso).getUTCDay();
}

export function isWeekend(iso: IsoDate): boolean {
  const w = weekday(iso);
  return w === 0 || w === 6;
}

/** The next `n` workdays (Mon–Fri) starting at `from` inclusive (R-2). */
export function workdays(n: number, from: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let d = from;
  while (out.length < n) {
    if (!isWeekend(d)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/** The `offset`-th workday from `from` (0 = `from` or the next workday). Used by the seed. */
export function workdayOffset(from: IsoDate, offset: number): IsoDate {
  return workdays(offset + 1, from)[offset]!;
}

/** "Wed 15 Oct" (ui.md, Feedback texts). */
export function formatLong(iso: IsoDate): string {
  return toUtcNoon(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** "Wed" */
export function formatWeekday(iso: IsoDate): string {
  return toUtcNoon(iso).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
}

/** "15" */
export function dayNumber(iso: IsoDate): string {
  return String(toUtcNoon(iso).getUTCDate());
}
