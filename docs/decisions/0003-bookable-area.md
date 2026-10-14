# 0003 Bookable part of the floor
Status: open
Requirement: O-12, R-5
Date: 2026-10-14

## Question
Which part of the floor belongs to us and can be booked?

## Options
1. **East part only** (default while open). About 92 seats, codes `A-`. The September slide
   writes "VISMA" east of the red divider. Not confirmed.
2. **Whole floor.** 168 seats, codes `A-` and `B-`.

## Decision
Open.

## Consequences
The switch `area: east | all` is per-user in the browser. Under `east`, west seats have
status `off`: drawn with a dashed outline under a translucent overlay, not selectable, not
counted, not considered by team search. The server does not enforce the area while the
decision is open; once decided as `east`, bookings for west seats are rejected with 400.
