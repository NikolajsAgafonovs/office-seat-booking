# Acceptance scenarios

Every scenario here must map to at least one automated test. Server scenarios are API-level
tests against a real database. Client scenarios are component tests; the ones marked (e2e)
also get a browser test. Scenario IDs are stable and referenced from test names.

Fixtures: a floor plan from `floor-plan.json`, users `alice` (employee), `bob` (employee),
`carol` (admin), `dan` (read-only). "Today" is frozen to a Wednesday in the office time zone.

## Viewing

- **A-01** Given the fixtures, when the client loads, then the day picker offers exactly 10
  buttons, none of them a Saturday or Sunday, the first being today. (R-2)
- **A-02** Given decision 0003 is `east`, then stats count 92 bookable seats and every
  west seat has status `off`. Given `all`, stats count 168. (R-5, O-12)
- **A-03** Given alice has `A-10` for the full day, when bob views that day, then `A-10` is
  `taken`, and when alice views it, it is `mine`. (R-3)
- **A-04** Given decision 0001 is `half` and alice has `A-10` for `am` only, when bob views
  the full day, then `A-10` is `partial`; when bob views the morning it is `taken`; the
  afternoon it is `free`. (R-7, O-1)

## Booking

- **A-05** (e2e) When alice selects free `A-10` and clicks "Book this seat", then two
  bookings exist (`am`, `pm`) with `by = bookedBy = alice`, the seat turns `mine`, and a
  toast says "Booked A-10 for {day}". (R-7, R-9, R-12)
- **A-06** When alice and bob POST a booking for the same seat, date and slots at the same
  time, then exactly one succeeds and the other response lists the seat under `lost`. The
  database holds exactly two rows for that seat and date. (R-10)
- **A-07** When alice cancels her `A-10` booking, then both slot rows are deleted and the
  seat is `free` for bob within the live-update window. (R-8, R-26)
- **A-08** When bob tries to DELETE alice's booking, then 403 `forbidden` and the row stays.
- **A-09** When dan (read-only) POSTs a booking, then 403, and the client switches to
  read-only mode and disables write controls. (R-25)
- **A-10** When alice POSTs a booking for yesterday, then 400 `invalid_argument`.
  (invariant 6)
- **A-11** "My bookings" lists alice's upcoming bookings grouped by date and seat, newest
  last, omits yesterday's, and "Show" switches the map to that day and selects the seat.
  (R-11)

## Team booking

- **A-12** Given row `eB` block `blk3` has all 6 seats free, when alice asks for 4 seats
  together, then the finder returns 4 seats from a single block with the fewest free seats
  that still fits 4 (R-14 preference), not from `blk3` if a 4-seat block is fully free.
- **A-13** Given no single block has 5 free seats but two neighbouring blocks in row `eS`
  have 3 free each, when alice asks for 5, then 5 consecutive seats across those blocks are
  returned. (R-14)
- **A-14** Given fewer than 12 free seats exist on the day, when alice asks for 12, then no
  seats are selected and the toast says no group fits. (R-14)
- **A-15** (e2e) When alice assigns seat 2 to bob via directory search and seat 3 the
  label "Guest", then books, then: seat 1 has `by = bookedBy = alice`; seat 2 has `by =
  bob`, `bookedBy = alice`; seat 3 has `by = bookedBy = alice`, `label = "Guest"`. Bob's
  "My bookings" shows seat 2. (R-15, R-16)
- **A-16** When alice books a team of 3 and one seat was taken a moment earlier, then the
  other two are booked and the toast names the lost seat. (R-17)
- **A-17** When a POST includes both `by = bob` and a `label`, then 400. (invariant 7)

## Dedicated seats

- **A-18** When carol (admin) PUTs a dedication of `A-20` to alice, then `A-20` is `dedmine`
  for alice and `ded` for bob on every day, and appears first in alice's "My bookings" as
  dedicated. (R-18, R-19, R-21)
- **A-19** When bob PUTs a dedication, then 403.
- **A-20** When bob POSTs a booking for dedicated `A-20`, then 409 `conflict`. (invariant 3)
- **A-21** Given decision 0002 is `release`, when alice releases `A-20` for Friday, then on
  Friday `A-20` is `free` for bob and bob can book it; on Thursday it is still `ded`.
  (R-20)
- **A-22** Given bob booked released `A-20` on Friday, when alice tries to take it back,
  then 409 and the client shows the take-back button disabled. (R-20)
- **A-23** Given decision 0002 is `locked`, then alice sees no release controls and a PUT
  release is rejected with 409 once the decision is settled server-side. (O-2)
- **A-24** When carol removes the dedication, then `A-20` is `free` and the toast says it is
  bookable again.

## Live updates

- **A-25** Given two clients on the same day, when one books `A-30`, then the other shows
  `A-30` as `taken` without a reload within 5 seconds. (R-26)

## Non-functional

- **A-26** At a 375 px viewport the map scrolls horizontally, the side panel is below it,
  and no page-level horizontal scroll exists. (R-27)
- **A-27** With `prefers-color-scheme: dark`, the page background is `--bg` dark and seat
  colours use the dark tokens. (R-28)
- **A-28** Every seat is reachable by Tab and selectable by Enter; the seat card updates and
  is announced. (R-6, R-29)
- **A-29** A booking made at 23:30 office time for "today" is stored with today's calendar
  date even if the server runs in UTC. (R-30)
