# 0005 Seat codes
Status: open
Requirement: O-13, C-2
Date: 2026-10-14

## Question
What codes do seats carry so people can find them on the physical floor?

## Options
1. **Placeholders** (default while open): `A-01` to `A-92` east, `B-01` to `B-76` west, in
   walking order. These are the `id` values in `floor-plan.json`.
2. The real desk labels, once facilities provide them.

## Decision
Open.

## Consequences
When real labels arrive, add a `code` field to each seat in `floor-plan.json` and display
`code`, while `id` stays as the storage key so existing bookings and dedications are
unaffected. The footer note about placeholder codes is removed at that point.
