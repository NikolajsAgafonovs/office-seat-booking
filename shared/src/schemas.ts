// Request validation shared by server (enforced) and client (pre-flight). Source: docs/api.md.
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` that is also a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(ISO_DATE, 'date must be YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'date is not a real calendar date');

export const slotSchema = z.enum(['am', 'pm']);

/** Placeholder seat code scheme (decision 0005). Existence is checked against the floor plan server-side. */
export const seatCodeSchema = z.string().regex(/^[AB]-\d{2}$/, 'seat code must look like A-01');

export const userIdSchema = z.string().trim().min(1).max(200);

/** POST /api/bookings body. Invariant 7 (`label` only when `by` is the caller) is checked server-side. */
export const createBookingsSchema = z.object({
  date: isoDateSchema,
  slots: z.array(slotSchema).min(1).max(2),
  items: z
    .array(
      z.object({
        seat: seatCodeSchema,
        by: userIdSchema.optional(),
        label: z.string().trim().min(1).max(80).optional(),
      }),
    )
    .min(1)
    .max(12),
});

/** POST /api/users/resolve body. */
export const resolveUsersSchema = z.object({
  ids: z.array(userIdSchema).max(500),
});

/** PUT /api/dedications/:seat body. */
export const putDedicationSchema = z.object({
  owner: userIdSchema,
});

/** Per-user browser settings (decisions 0001, 0002, 0003). */
export const settingsSchema = z.object({
  slotSize: z.enum(['day', 'half']),
  area: z.enum(['east', 'all']),
  dedRule: z.enum(['release', 'locked']),
});
