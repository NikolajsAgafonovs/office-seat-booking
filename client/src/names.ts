// Display names per docs/domain-model.md "Display names" (R-23). Simulated fixture
// bookings get a deterministic placeholder, ported from the prototype's SIM_NAMES.
import { SIM_USER } from '@seat/shared';
import type { UserProfile } from '@seat/shared';

const SIM_NAMES = [
  'Jānis Ozols',
  'Laura Ozola',
  'Mārtiņš Kalniņš',
  'Elīna Kalniņa',
  'Kristaps Bērziņš',
  'Agnese Bērziņa',
  'Edgars Liepiņš',
  'Sanita Liepiņa',
  'Raimonds Krūmiņš',
  'Dace Krūmiņa',
  'Kārlis Zariņš',
  'Zane Zariņa',
  'Andris Vītols',
  'Linda Vītola',
  'Toms Jansons',
  'Ilze Jansone',
  'Roberts Pētersons',
  'Evija Pētersone',
  'Gints Siliņš',
  'Marta Siliņa',
  'Artūrs Eglītis',
  'Kristīne Eglīte',
  'Mareks Kļaviņš',
  'Santa Kļaviņa',
  'Ola Hansen',
  'Kari Johansen',
  'Erik Olsen',
  'Ingrid Larsen',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable made-up name for a simulated booking, keyed by seat and date (as in the prototype). */
export function simName(seat: string, date: string): string {
  return SIM_NAMES[(hash(seat) + (hash(date) % 3)) % SIM_NAMES.length]!;
}

export interface NameContext {
  meId: string | null;
  profiles: Record<string, UserProfile>;
}

export interface Occupant {
  by: string;
  bookedBy?: string;
  label?: string | null;
  seat?: string;
  date?: string;
}

/**
 * Name to show for an occupant or owner:
 * simulated → placeholder "(simulated)"; label when `by == bookedBy`; "you" for the current
 * user; otherwise the resolved directory name.
 */
export function personName(o: Occupant, ctx: NameContext): string {
  if (o.by === SIM_USER) return `${simName(o.seat ?? '', o.date ?? '')} (simulated)`;
  if (o.label && (o.bookedBy === undefined || o.bookedBy === o.by)) return o.label;
  if (ctx.meId && o.by === ctx.meId) return 'you';
  return ctx.profiles[o.by]?.name ?? 'Someone';
}
