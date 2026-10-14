# UI specification

The React client. `reference/prototype.html` is the visual and behavioural reference: when
this document is silent, do what the prototype does. When they disagree, this document wins
and the disagreement should be fixed here, not worked around in code.

## Layout

One page, no routing.

1. **App bar**: product name, a one-line subtitle (environment note), a mode pill, the
   current user's avatar and name. There is no sign-out control; sessions end with the
   identity provider (decision 0007).
2. **Controls row**: day picker (10 workday buttons, R-2) and time picker (Full day /
   Morning / Afternoon). The time picker is only enabled when decision 0001 is `half`.
   Each day button shows the weekday abbreviation, the day number and the short month
   ("Wed", "15", "Oct") and has an `aria-label` with the full "Wed 15 Oct" form.
3. **Workspace**, two columns on wide screens, stacked on narrow ones (R-27):
   - **Map card** (wide): title "Floor map · {day}[ · morning|afternoon]", occupancy stats
     (R-5), the SVG map in a horizontally scrollable wrapper, and a legend.
   - **Side panel**: Seat card, "Book together" card, "My bookings" card.
4. **Settings strip** "Open questions, as switches": one segmented control per open
   decision, in record order (0001, 0002, 0003), each with its O- id and a one-sentence
   note. Hidden entirely once all three decisions are settled. Values persist per browser.
5. **Footer**: notes on placeholder seat codes (O-13), traced geometry (C-2), meeting rooms
   out of scope (C-1).
6. **Toast**: single `role="status"` element, bottom centre, auto-hides after about 3 s.

## Mode pill

| Mode | Text | When |
|---|---|---|
| shared | "Shared · live for everyone" | authenticated, can write |
| readonly | "Read-only" | authenticated, cannot write, or a write was refused with `forbidden` |
| connecting | "Connecting…" | before `/api/me` resolves |
| signed out | "Signed out" | `/api/me` returned `unauthenticated`; the sign-in card replaces the workspace |

## Map

- SVG with the viewBox from `floor-plan.json`. Draw in this order: floor fill and outline,
  core areas, rooms with labels, the red divider, an "off" overlay over the west part when
  decision 0003 is `east`, desks, seats, seat code labels.
- Each seat is a `<g>` with `tabindex=0`, `role="button"`, `aria-label="{code}, {status
  text}"` and a `<title>` for the tooltip (R-6). The tooltip reads "{code} · {status text}"
  followed by " · {occupant names}" when the seat is booked. Click or Enter/Space selects
  it. Selecting an `off` seat does not select; it toasts an explanation referencing O-12.
- Seat code labels are drawn inside each seat as small decorative text (`aria-hidden`; the
  code is already in the seat's accessible name). They are legible on wide screens only;
  on phones the tooltip and the seat card carry the code. Accepted for now.
- Seat fill and stroke by status (tokens in the Visual language section): free = surface
  fill with `--free` stroke; mine = `--accent` fill; taken = `--taken` fill; partial = half
  `--taken` half surface; ded/dedmine = `--dedicated` hatched; off = dashed `--taken`
  stroke, no fill; selected or in the team set = thick `--select` stroke on top of the
  status look.
- Stats: "N free · N taken · N dedicated · N bookable". "Taken" includes the user's own.

## Seat card

Empty state: heading "Pick a seat" and a hint. Selected state: large seat code and a status
chip, then a definition list (Area, When, Dedicated to, Booked by), then action buttons per
`domain-model.md` "Available actions per status", then a hint line when relevant:

- read-only: "You can look but not book: this view is read-only for you."
- admin: "Dedication controls show because you are an admin (O-2, O-7)."

Admin dedication: "Make dedicated" opens an inline directory search (the same control as
in Book together, without the free-text fallback) to pick the owner, then calls
`PUT /api/dedications/:seat`. "Remove dedication" needs no input.

## Book together

Number input 2 to 12 (default 4) and a "Find seats together" button. On success the seats are
highlighted on the map and an assignment list appears: one row per seat with the seat code
and a text input. First input placeholder "You", others "Search a colleague…". Typing
searches the directory (`GET /api/users`) after the first character and shows up to 6
results with avatars in a dropdown; picking one assigns that colleague. Text that matches
no pick is kept as a free-text label. Buttons: "Book N seats" (primary, disabled when
read-only) and "Clear". After booking, the team set is cleared.

## My bookings

List of upcoming bookings grouped by date and seat, sorted by date, with dedicated seats
first and shown as "{code} · dedicated to you". Each row: seat code in monospace, the date
and half-day if applicable, a "Show" button (switches the day, selects the seat, focuses it
on the map) and, for bookings, a "Cancel" button. Empty state: "No upcoming bookings yet.
Pick a free seat to make one."

## Feedback texts

| Event | Toast |
|---|---|
| booked one | "Booked {seat} for {day}" |
| booked many | "Booked {n} seats for {day}" |
| some lost | "{seats} was/were just taken by someone else. Pick another seat." |
| cancelled | "Cancelled {seat} on {day}" |
| released | "Released {seat} for {day}" |
| taken back | "Seat {seat} is yours again" |
| take back refused (409) | "Someone else holds a booking for that seat today, so it cannot be taken back." |
| dedicated | "{seat} is now dedicated to {name}" |
| undedicated | "{seat} is bookable again" |
| no group | "No group of {n} free seats together on this day. Try another day or fewer people." |
| found group | "Found {n} seats together: {first} to {last}" |
| off seat | "{seat} is outside the bookable part in this setting (O-12)." |
| forbidden | "This page is read-only for you, so the booking was not saved." then switch to readonly |
| quota | "Storage is full. Cancel some old bookings and try again." |
| other error | "Could not save. Check your connection and try again." |

Day format: `en-GB`, "Wed 15 Oct". Day picker buttons show weekday abbreviation and day
number.

## Visual language

Use CSS custom properties, defined on `:root`, redefined for dark mode via
`prefers-color-scheme` (R-28):

| Token | Light | Dark | Role |
|---|---|---|---|
| --bg | #eef2f5 | #0f161d | page |
| --surface | #ffffff | #17212b | cards |
| --ink | #142230 | #e2e9ef | text |
| --muted | #5b6b7a | #93a2b0 | secondary text |
| --line | #d3dce4 | #2a3744 | borders |
| --floor | #f9fbfc | #1b2631 | floor fill |
| --wall | #31414f | #9fb0bf | outline stroke |
| --room | #e3e9ef | #233140 | rooms |
| --core | #c9d3dc | #2e3d4c | lifts, stairs |
| --accent | #1d5fa6 | #6aa6ec | my seats, primary buttons |
| --free | #1f8a74 | #4cc4a6 | free seat stroke |
| --taken | #a7b3be | #4f5f6e | taken fill |
| --dedicated | #7b4fb8 | #b08ae6 | dedicated hatch |
| --select | #e09b22 | #f0b44a | selection stroke |
| --divider | #d2433b | #ef6b62 | red divider |

Fonts: display "Bricolage Grotesque", body "Figtree", mono "JetBrains Mono", each with
system fallbacks. Loaded from Google Fonts.

## Accessibility (R-29)

Segmented controls use `aria-pressed`. The seat card is `aria-live="polite"`. All buttons
are real `<button type="button">`. Focus is visible. Colour is never the only carrier of
status: the seat card chip and tooltips repeat it in words.
