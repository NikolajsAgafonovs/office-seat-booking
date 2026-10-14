# Requirements

Version: reconstructed from prototype v0.2, 2026-10-14. **Must be reconciled with the
original requirements v0.2 document.** IDs are stable; never renumber. Deprecate instead.

ID prefixes: `R-` requirement, `O-` open question (see `decisions/`), `C-` constraint or
explicit non-goal.

## Purpose

Let employees on one office floor see which desks are free on a given day and book one for
themselves or for a group of colleagues sitting together.

## Users

- **Employee**: any authenticated person. Can view the map, book and cancel their own
  seats, book seats for colleagues as part of a team booking, and manage releases of their
  own dedicated seat.
- **Admin**: an employee with the admin role (O-7). Additionally assigns and removes
  dedicated seats.
- **Read-only viewer**: an authenticated person without write permission. Sees everything,
  can book nothing. The UI must say so plainly.

## Functional requirements

### Viewing

- **R-1** The app shows the floor map with every seat in `floor-plan.json`, drawn at its
  traced position and orientation, plus rooms, core areas and the floor outline.
- **R-2** The user picks a day from the next 10 workdays (Monday to Friday) starting today.
  Weekends are never offered.
- **R-3** Each seat is coloured by its status for the chosen day and time slot (see
  `domain-model.md`, Seat status). A legend explains the colours.
- **R-4** Selecting a seat shows a seat card with: code, status, area (east/west), the chosen
  day and slot, who it is dedicated to (if anyone), who has booked it (per half-day if the
  two halves differ), and the actions available to the current user.
- **R-5** The map header shows counts for the chosen day and slot: free, taken, dedicated,
  bookable total. Seats outside the bookable area (O-12) are excluded from all counts.
- **R-6** Hovering or focusing a seat shows its code and status as a tooltip. Seats are
  keyboard focusable and announce code plus status to assistive technology.

### Booking

- **R-7** An employee can book a free seat for the chosen day and slot. A seat where only
  one half-day is free can be booked for that free half.
- **R-8** An employee can cancel a booking they made or that was made for them.
- **R-9** A booking is for exactly one seat, one date and one slot (`am` or `pm`). A
  full-day booking is stored as two slot bookings. See O-1 for whether half days are offered.
- **R-10** Two people can never hold the same seat, date and slot. Under concurrent
  attempts exactly one succeeds. The loser is told the seat was just taken and to pick
  another.
- **R-11** A "My bookings" list shows the user's upcoming bookings (today and later) grouped
  by date and seat, plus any seat dedicated to them. Each entry can be shown on the map or
  cancelled. Past bookings are not listed.
- **R-12** Every write action gives immediate feedback (toast) naming the seat and date.

### Team booking ("Book together")

- **R-13** The user enters a group size from 2 to 12 and asks for seats together on the
  chosen day and slot.
- **R-14** The finder prefers the smallest single desk block that has at least N free seats.
  If no block fits, it walks along desk rows and takes consecutive free seats from
  neighbouring blocks in the same row. If nothing fits, it says so and suggests another day
  or a smaller group.
- **R-15** The found seats are highlighted on the map. For each seat the user can name the
  occupant: a colleague picked from a directory search, a free-text label (a seat held for
  the team), or leave it as themselves. The first seat defaults to the booker.
- **R-16** Booking the group creates one booking per seat and slot. A seat assigned to a
  colleague is booked **by** that colleague (it appears in their list and they can cancel
  it) and records who made the booking. A labelled seat is held by the booker with the
  label shown as the occupant.
- **R-17** If some of the group's seats were taken in the meantime, the rest are still
  booked and the user is told which ones were lost.

### Dedicated seats

- **R-18** A seat can be dedicated to one person. A dedicated seat is never bookable by
  anyone else, except as described in O-2.
- **R-19** The owner of a dedicated seat sees it in "My bookings" as dedicated, without a
  date.
- **R-20** Under decision O-2 "owner can release": the owner can release the seat for a
  chosen day, making it bookable by others that day, and can take it back as long as nobody
  else has booked it.
- **R-21** Only admins (O-7) assign or remove dedications.

### Identity and permissions

- **R-22** Users are identified by the organisation's identity provider (see decision
  0007). The app never has its own passwords.
- **R-23** The app shows the current user's name and avatar.
- **R-24** Colleague search for team booking queries the organisation directory by name and
  returns name and avatar. Results mark the current user as "(you)".
- **R-25** If the user lacks write permission, all write controls are disabled and the seat
  card says the view is read-only. A write that is rejected by the server for permission
  reasons switches the client to read-only mode.

### Live updates

- **R-26** Bookings, releases and dedications made by others appear on the map without a
  manual refresh, within a few seconds.

## Non-functional requirements

- **R-27** The map is usable on a phone: it scrolls sideways rather than shrinking below
  legibility, and the side panel stacks below it.
- **R-28** Light and dark colour schemes follow the operating system preference.
- **R-29** All interactive elements are reachable and operable by keyboard; state is
  conveyed with `aria-pressed`, `aria-live` and labels, not colour alone.
- **R-30** Dates are handled in the office's local time zone, which is **Europe/Riga**.
  Booking keys use the calendar date, not UTC instants. The zone is configuration
  (`OFFICE_TZ`), exposed to the client by the API (see `api.md`, `GET /api/me`), so the
  client never hard-codes it.

## Open questions

Each has a decision record in `decisions/`. Until decided, the app exposes the alternatives
as a per-user runtime switch so stakeholders can compare them.

- **O-1** Booking slot size: full days only, or half days (4-hour blocks). Hourly was a
  third option and is not implemented. `[from prototype]`
- **O-2** Dedicated seat on the owner's day off: owner can release it, or it stays reserved.
  Who assigns dedicated seats is also open. `[from prototype]`
- **O-7** Admin role: who gets it and how. `[from prototype, referenced only]`
- **O-12** Bookable part of the floor: east part only (about 92 seats, "VISMA" east of the
  red divider on the September slide) or the whole floor (168 seats). `[from prototype]`
- **O-13** Seat codes: `A-` east and `B-` west are placeholders pending the real numbering.
  `[from prototype]`

## Constraints and non-goals

- **C-1** Meeting rooms are out of scope. They are drawn on the map but not bookable.
- **C-2** Desk positions are traced from a low-resolution slide image. Small differences from
  the real floor are accepted. The geometry is data (`floor-plan.json`) and is edited, never
  regenerated.
- **C-3** Only one floor.
