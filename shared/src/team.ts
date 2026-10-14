// "Book together" seat finder. Source: docs/requirements.md R-14, docs/floor-plan.md "Rows".
import type { Block, Settings } from './index.js';

/**
 * Find `n` seats together on the chosen day.
 *
 * 1. Prefer the single desk block with the fewest free seats that still has at least `n`
 *    (keeps big blocks for big groups).
 * 2. Otherwise walk each row in file order and take consecutive free seats across
 *    neighbouring blocks.
 * 3. Otherwise null.
 */
export function findTogether(
  n: number,
  blocks: readonly Block[],
  isFree: (seatId: string) => boolean,
  area: Settings['area'],
): string[] | null {
  const eligible = blocks.filter((b) => area === 'all' || b.part === 'east');

  let best: string[] | null = null;
  for (const b of eligible) {
    const free = b.seats.filter(isFree);
    if (free.length >= n && (!best || free.length < best.length)) best = free;
  }
  if (best) return best.slice(0, n);

  const rows = new Map<string, Block[]>();
  for (const b of eligible) {
    const arr = rows.get(b.row);
    if (arr) arr.push(b);
    else rows.set(b.row, [b]);
  }
  for (const row of rows.values()) {
    for (let i = 0; i < row.length; i++) {
      let acc: string[] = [];
      for (let j = i; j < row.length && acc.length < n; j++) {
        acc = acc.concat(row[j]!.seats.filter(isFree));
      }
      if (acc.length >= n) return acc.slice(0, n);
    }
  }
  return null;
}

export const TEAM_MIN = 2;
export const TEAM_MAX = 12;

export function clampTeamSize(v: number): number {
  if (!Number.isFinite(v)) return TEAM_MIN;
  return Math.max(TEAM_MIN, Math.min(TEAM_MAX, Math.trunc(v)));
}
