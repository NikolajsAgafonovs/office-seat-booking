// Floor plan types and validation. Source: docs/floor-plan.md "Schema". The data itself is
// docs/floor-plan.json and is never generated (C-2).
import { z } from 'zod';
import type { Part } from './types.js';

const rect = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const labelledRect = rect.extend({ label: z.string() });
const partSchema = z.enum(['east', 'west']);

export const seatSchema = z.object({
  id: z.string(),
  part: partSchema,
  block: z.string(),
  x: z.number(),
  y: z.number(),
  face: z.enum(['L', 'R', 'U', 'D']),
  rot: z.number().nullable(),
  cx: z.number().nullable(),
  cy: z.number().nullable(),
  /** Real desk label once decision 0005 is settled; display this when present. */
  code: z.string().optional(),
});

export const blockSchema = z.object({
  id: z.string(),
  row: z.string(),
  part: partSchema,
  rot: z.number().nullable(),
  cx: z.number().nullable(),
  cy: z.number().nullable(),
  desk: rect,
  seats: z.array(z.string()),
});

export const floorPlanSchema = z.object({
  source: z.string(),
  viewBox: z.string(),
  outline: z.string(),
  rooms: z.array(labelledRect),
  core: z.array(labelledRect),
  blocks: z.array(blockSchema),
  seats: z.array(seatSchema),
});

export type Seat = z.infer<typeof seatSchema>;
export type Block = z.infer<typeof blockSchema>;
export type FloorPlan = z.infer<typeof floorPlanSchema>;

/** Validate and index a floor plan. Throws on schema or referential errors. */
export function loadFloorPlan(raw: unknown): IndexedFloorPlan {
  const plan = floorPlanSchema.parse(raw);
  const seatById = new Map<string, Seat>();
  for (const s of plan.seats) {
    if (seatById.has(s.id)) throw new Error(`duplicate seat id ${s.id}`);
    seatById.set(s.id, s);
  }
  for (const b of plan.blocks) {
    for (const id of b.seats) {
      const s = seatById.get(id);
      if (!s) throw new Error(`block ${b.id} references unknown seat ${id}`);
      if (s.block !== b.id)
        throw new Error(`seat ${id} claims block ${s.block}, listed in ${b.id}`);
    }
  }
  return { ...plan, seatById };
}

export interface IndexedFloorPlan extends FloorPlan {
  seatById: ReadonlyMap<string, Seat>;
}

/** Display code for a seat (decision 0005). */
export function seatLabel(seat: Pick<Seat, 'id' | 'code'>): string {
  return seat.code ?? seat.id;
}

export function partName(part: Part): string {
  return part === 'east' ? 'East part' : 'West part';
}
