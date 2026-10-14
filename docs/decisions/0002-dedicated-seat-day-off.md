# 0002 Dedicated seat on the owner's day off
Status: open
Requirement: O-2, R-18, R-20
Date: 2026-10-14

## Question
When the owner of a dedicated seat is not in the office, can others use the seat?

## Options
1. **Owner can release it** (default while open). The owner marks specific days as released;
   on those days the seat behaves like a free seat for everyone. The owner can take it back
   while nobody else holds it.
2. **Always reserved.** The seat is never bookable by others. No release controls exist.

## Decision
Open. Who assigns dedicated seats is a separate question, see 0004.

## Consequences
The Release entity exists regardless, so option 1 can be enabled without migration. The
switch `dedRule: release | locked` is per-user in the browser. The server accepts release
writes while the decision is open; once decided as `locked`, release endpoints return 409
and the client hides the controls.
