# 0001 Booking slot size
Status: open
Requirement: O-1, R-9
Date: 2026-10-14

## Question
What is the smallest unit a seat can be booked for?

## Options
1. **Full days only** (default while open). The time picker is hidden; a booking always
   covers both `am` and `pm` slots.
2. **Half days.** Morning and afternoon (4-hour blocks, proposed by Tolga). The time picker
   is shown; "Book the free half" becomes possible.
3. Hourly. Mentioned in v0.2, not implemented in the prototype and not offered by the
   switch. Would require a schema change (slot becomes a time range).

## Decision
Open.

## Consequences
Storage is always per half-day slot (R-9) so option 2 can be enabled without migration.
The switch `slotSize: day | half` lives in per-user browser settings. When `day`, the client
forces slot selection to full day and disables the Morning/Afternoon buttons.
