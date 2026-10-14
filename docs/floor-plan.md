# Floor plan data

`floor-plan.json` is the single source of seat and room geometry. It is **data, not code**.
Claude Code must never regenerate it from scratch, infer positions, or "tidy" coordinates.
Edits are made by humans (or by Claude Code only when a doc change explicitly asks for a
specific seat or room to move, be added or removed).

## Provenance

Coordinates were traced in the prototype from the September 2025 floor plan slide, a
1431 x 534 px raster image. Accuracy is limited by that image (C-2). The real slide is not
in this repository yet. When it is added, store it as `docs/reference/floor-plan.png`.

The JSON was produced on 2026-10-14 by executing the geometry section of
`reference/prototype.html` unchanged and serialising its arrays. Counts: 168 seats
(92 east, 76 west), 35 desk blocks, 21 rooms, 3 core areas.

## Coordinate system

All numbers are SVG user units in one shared space. The map should be drawn with
`viewBox="70 52 1320 470"`. Seats are drawn as 18 x 18 squares centred on `(x, y)`, rotated
by `rot` degrees around `(cx, cy)` when `rot` is set (the east wedge blocks are tilted 27°).
Desks are rectangles. The red divider between parts runs from roughly `(660, 65)` down to
`(660, 508)` in the prototype's drawing; treat it as a visual guide for O-12, not data.

## Schema

```
{
  source:  string          provenance note
  viewBox: string          "minX minY width height"
  outline: string          SVG polygon points for the floor outline
  rooms:   [{ x, y, w, h, label }]     non-bookable rooms (C-1), drawn with label
  core:    [{ x, y, w, h, label }]     lifts, stairs, WC; drawn darker, no interaction
  blocks:  [{ id, row, part, rot, cx, cy, desk: { x, y, w, h }, seats: [seatId] }]
  seats:   [{ id, part, block, x, y, face, rot, cx, cy }]
}
```

- `id` (seat): the code shown to users. Placeholder scheme until O-13 is settled:
  `A-` + two digits for east, `B-` + two digits for west, numbered in a walking order
  (east: north row, bump-out, wedge, south row).
- `part`: `east` | `west`.
- `face`: which way the chair faces relative to the desk: `L`, `R`, `U`, `D`. Used only
  for drawing.
- `rot`, `cx`, `cy`: rotation in degrees and pivot; `null` when unrotated.
- `row`: groups blocks that line up along a corridor. Team booking (R-14) walks blocks
  within a row in array order, so **block order inside the file is meaningful**.

## Rows

| Row | Part | Where |
|---|---|---|
| eN | east | north wall, 3 blocks of 4 |
| eB | east | north bump-out, 4 blocks of 6 |
| eW0..eW3 | east | tilted wedge along the diagonal wall |
| eS | east | south wall, 6 blocks of 6 |
| wN | west | north wall, 7 blocks of 4 |
| wW1..wW4 | west | west wall, horizontal blocks |
| wS | west | south wall, 5 blocks of 4 and 2 blocks of 6 |

## Changing the plan

To move, add or remove a seat: edit `floor-plan.json` directly and record why in this file
under a dated "Changes" heading. Seat codes are never reused after removal. If O-13 settles
on real codes, add a `code` field alongside `id` rather than rewriting `id`, so existing
bookings keep their key.

## Changes

- 2026-10-14: initial extraction from the prototype.
