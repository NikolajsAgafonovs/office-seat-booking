// SVG floor map (ui.md "Map", R-1, R-3, R-6). Draw order: floor fill and outline, core
// areas, rooms, red divider, "off" overlay (decision 0003 east), desks, seats, seat codes.
// Geometry comes from docs/floor-plan.json via the store; nothing here is derived from it.
import { useEffect } from 'react';
import { STATUS_TEXT, seatLabel } from '@seat/shared';
import type { Block, Booking, Dedication, Seat, SeatStatus } from '@seat/shared';
import { useDerived } from '../hooks';
import { personName } from '../names';
import type { NameContext } from '../names';
import { useStore } from '../store';

/** Prototype's divider and west overlay; a visual guide for O-12, not data (floor-plan.md). */
const OFF_ZONE = '83,83 636,83 636,232 694,232 694,508 537,508 537,488 83,488';
const DIVIDER = [
  { x1: 636, y1: 83, x2: 636, y2: 232 },
  { x1: 694, y1: 382, x2: 694, y2: 508 },
];

const LIGHT_TEXT: ReadonlySet<SeatStatus> = new Set(['mine', 'taken', 'dedmine']);

function blockTransform(b: Pick<Block, 'rot' | 'cx' | 'cy'>): string | undefined {
  return b.rot ? `rotate(${b.rot} ${b.cx} ${b.cy})` : undefined;
}

/** Chair back position by facing direction (drawing only; floor-plan.md "face"). */
function backRect(s: Seat): { x: number; y: number; width: number; height: number } {
  switch (s.face) {
    case 'R':
      return { x: s.x - 9.5, y: s.y - 6, width: 3, height: 12 };
    case 'L':
      return { x: s.x + 6.5, y: s.y - 6, width: 3, height: 12 };
    case 'D':
      return { x: s.x - 7, y: s.y - 8.5, width: 14, height: 3 };
    case 'U':
      return { x: s.x - 7, y: s.y + 5.5, width: 14, height: 3 };
  }
}

/** Tooltip text (R-6): code, status in words, and who holds it when someone does. */
function seatTitle(
  code: string,
  st: SeatStatus,
  bookings: readonly Booking[],
  ded: Dedication | undefined,
  names: NameContext,
): string {
  let who = '';
  if (st === 'ded' && ded) who = personName({ by: ded.owner }, names);
  else if (st === 'taken' || st === 'partial' || st === 'mine') {
    who = [...new Set(bookings.map((b) => personName(b, names)))].join(', ');
  }
  return `${code} · ${STATUS_TEXT[st]}${who ? ` · ${who}` : ''}`;
}

export function FloorMap() {
  const plan = useStore((s) => s.floorPlan);
  const area = useStore((s) => s.settings.area);
  const selection = useStore((s) => s.selection);
  const team = useStore((s) => s.team);
  const focusSeat = useStore((s) => s.focusSeat);
  const clearFocus = useStore((s) => s.clearFocus);
  const selectSeat = useStore((s) => s.selectSeat);
  const meId = useStore((s) => s.me?.id ?? null);
  const profiles = useStore((s) => s.profiles);
  const dedications = useStore((s) => s.dedications);
  const derived = useDerived();

  // R-11 "Show" moves keyboard focus to the seat once it is rendered.
  useEffect(() => {
    if (!focusSeat) return;
    document.getElementById(`seat-${focusSeat}`)?.focus();
    clearFocus();
  }, [focusSeat, clearFocus]);

  if (!plan) return null;
  const names: NameContext = { meId, profiles };
  const teamSet = new Set(team);
  const outlinePoints = plan.outline.replace(/\s*Z\s*$/, '');

  return (
    <svg
      className="map"
      viewBox={plan.viewBox}
      role="img"
      aria-label="Office floor map with selectable seats"
      data-testid="floor-map"
    >
      <defs>
        <pattern
          id="dedHatch"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3" height="3" fill="var(--surface)" />
          <rect width="1.2" height="3" fill="var(--dedicated)" />
        </pattern>
        <linearGradient id="halfTaken">
          <stop offset="50%" stopColor="var(--taken)" />
          <stop offset="50%" stopColor="var(--surface)" />
        </linearGradient>
      </defs>

      <polygon points={outlinePoints} className="floorfill" />
      <polygon points={outlinePoints} className="wall" />

      {plan.core.map((c, i) => (
        <g className="core" key={`core-${i}`}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={2} />
          <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 3} textAnchor="middle">
            {c.label}
          </text>
        </g>
      ))}

      {plan.rooms.map((r, i) => (
        <g className="room" key={`room-${i}`}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={2} />
          <text x={r.x + 4} y={r.y + 11}>
            {r.label}
          </text>
        </g>
      ))}

      {DIVIDER.map((l, i) => (
        <line key={`div-${i}`} className="divider" {...l} />
      ))}
      <text x={641} y={80} className="divlabel">
        dividing line (O-12)
      </text>

      {area === 'east' && <polygon points={OFF_ZONE} className="offzone" data-testid="off-zone" />}

      <g id="seats">
        {plan.blocks.map((b) => (
          <g key={b.id} transform={blockTransform(b)}>
            <rect
              x={b.desk.x}
              y={b.desk.y}
              width={b.desk.w}
              height={b.desk.h}
              rx={1.5}
              className="desk"
            />
            {b.seats.map((id) => {
              const s = plan.seatById.get(id);
              if (!s) return null;
              const code = seatLabel(s);
              const st = derived.status.get(id) ?? 'free';
              const sel = selection === id || teamSet.has(id);
              const title = seatTitle(
                code,
                st,
                derived.bookingsBySeat.get(id) ?? [],
                dedications[id],
                names,
              );
              return (
                <g
                  key={id}
                  id={`seat-${id}`}
                  className={`seat ${st}${sel ? ' sel' : ''}`}
                  data-seat={id}
                  data-status={st}
                  role="button"
                  tabIndex={0}
                  aria-label={`${code}, ${STATUS_TEXT[st]}`}
                  aria-pressed={selection === id}
                  onClick={() => selectSeat(id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectSeat(id);
                    }
                  }}
                >
                  <title>{title}</title>
                  <circle cx={s.x} cy={s.y} r={10} className="ring" />
                  <rect
                    x={s.x - 7}
                    y={s.y - 6}
                    width={14}
                    height={12}
                    rx={2.5}
                    className="cushion"
                  />
                  <rect {...backRect(s)} rx={1} className="back" />
                </g>
              );
            })}
          </g>
        ))}
      </g>

      <g className="codes" aria-hidden="true">
        {plan.blocks.map((b) => (
          <g key={`codes-${b.id}`} transform={blockTransform(b)}>
            {b.seats.map((id) => {
              const s = plan.seatById.get(id);
              if (!s) return null;
              const st = derived.status.get(id) ?? 'free';
              const tone = st === 'off' ? ' dim' : LIGHT_TEXT.has(st) ? ' light' : '';
              return (
                <text key={id} x={s.x} y={s.y + 1.6} className={`seatcode${tone}`}>
                  {seatLabel(s)}
                </text>
              );
            })}
          </g>
        ))}
      </g>
    </svg>
  );
}
