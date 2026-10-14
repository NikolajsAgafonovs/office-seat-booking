// Loads docs/floor-plan.json (C-2, docs/floor-plan.md). Validated once at startup.
import { readFileSync } from 'node:fs';
import { loadFloorPlan, type IndexedFloorPlan } from '@seat/shared';

export function readFloorPlan(filePath: string): IndexedFloorPlan {
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  return loadFloorPlan(raw);
}
