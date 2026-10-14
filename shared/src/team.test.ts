// "Book together" finder (R-14; acceptance A-12 to A-14) against the real floor plan.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadFloorPlan } from './floorPlan.js';
import { clampTeamSize, findTogether } from './team.js';

const planPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/floor-plan.json',
);
const plan = loadFloorPlan(JSON.parse(readFileSync(planPath, 'utf8')));
const blockOf = (seatId: string) => plan.seatById.get(seatId)!.block;

describe('findTogether', () => {
  it('A-12 prefers the smallest block that fits, not the largest free one', () => {
    // Everything free: a 4-seat block (row eN) should win over 6-seat blocks for n = 4.
    const found = findTogether(4, plan.blocks, () => true, 'east');
    expect(found).toHaveLength(4);
    const block = plan.blocks.find((b) => b.id === blockOf(found![0]!))!;
    expect(block.seats).toHaveLength(4);
    expect(new Set(found!.map(blockOf)).size).toBe(1);
  });

  it('A-13 falls back to consecutive seats across neighbouring blocks in one row', () => {
    // Leave exactly 3 free seats in each block of row eS and nothing else.
    const eS = plan.blocks.filter((b) => b.row === 'eS');
    const free = new Set(eS.flatMap((b) => b.seats.slice(0, 3)));
    const found = findTogether(5, plan.blocks, (id) => free.has(id), 'east');
    expect(found).toHaveLength(5);
    const rows = new Set(found!.map((id) => plan.blocks.find((b) => b.id === blockOf(id))!.row));
    expect(rows).toEqual(new Set(['eS']));
    expect(new Set(found!.map(blockOf)).size).toBe(2);
  });

  it('A-14 returns null when nothing fits', () => {
    const free = new Set(plan.seats.slice(0, 11).map((s) => s.id));
    expect(findTogether(12, plan.blocks, (id) => free.has(id), 'all')).toBeNull();
  });

  it('A-02 never uses west seats under the east setting', () => {
    const found = findTogether(6, plan.blocks, (id) => id.startsWith('B-'), 'east');
    expect(found).toBeNull();
    expect(findTogether(6, plan.blocks, (id) => id.startsWith('B-'), 'all')).toHaveLength(6);
  });
});

describe('clampTeamSize (R-13)', () => {
  it('clamps to 2..12 and handles garbage', () => {
    expect(clampTeamSize(1)).toBe(2);
    expect(clampTeamSize(99)).toBe(12);
    expect(clampTeamSize(4.7)).toBe(4);
    expect(clampTeamSize(Number.NaN)).toBe(2);
  });
});
