# Domain model

Governs: database schema, server-side validation, client-side status colouring. Changes here
require a migration and a test update.

## Vocabulary

| Term | Meaning |
|---|---|
| Seat | One bookable desk position. Identified by its code (`A-01` … `A-92`, `B-01` … `B-76`). Static; comes from `floor-plan.json`. |
| Block | A group of seats around one desk unit. Static. Used by team booking (R-14). |
| Row | A named line of blocks (`eN`, `eS`, `wW2` …). Static. Used by team booking to find seats across neighbouring blocks. |
| Part | `east` or `west` half of the floor, split by the red divider (O-12). |
| Date | A calendar day `YYYY-MM-DD` in the office time zone (R-30). |
| Slot | `am` or `pm`. A full day is both slots. There is no `day` slot in storage (R-9). |
| User | A person from the identity provider. Identified by an opaque stable `userId`. The app stores only the id; name and avatar are resolved at display time (R-23, R-24). |

## Entities

### Booking

Natural key: `(date, slot, seat)`. This key is **unique** and the uniqueness is enforced by
the database, not only by application code (R-10).

| Field | Type | Notes |
|---|---|---|
| date | date | |
| slot | `am` \| `pm` | |
| seat | seat code | must exist in `floor-plan.json` |
| by | userId | the occupant. Appears in this user's "My bookings". |
| bookedBy | userId | who made the booking. Equals `by` unless booked for a colleague (R-16). |
| label | string, optional | free-text occupant shown instead of a person, for seats held for a team (R-16). Only valid when `by == bookedBy`. |
| createdAt | timestamp | |

Who may delete a booking: the user who is `by` or the user who is `bookedBy` (R-8).

### Dedication

Natural key: `seat`. At most one owner per seat (R-18).

| Field | Type | Notes |
|---|---|---|
| seat | seat code | |
| owner | userId | |
| createdAt | timestamp | |

Who may create or delete: admins only (R-21, decision 0004).

### Release

Natural key: `(date, seat)`. Only meaningful for a seat that has a Dedication and only under
decision 0002 "owner can release" (R-20).

| Field | Type | Notes |
|---|---|---|
| date | date | |
| seat | seat code | |
| by | userId | must equal the Dedication owner at the time of writing |

Who may create: the dedication owner. Who may delete (take back): the owner, and only if no
booking by someone else exists for that seat and date.

### Per-user settings

Not shared, not server-side. The open-question switches (decisions 0001, 0002, 0003) are
stored in the browser (`localStorage`) per user because they are a stakeholder comparison
tool, not product state. When a decision is settled, its switch is removed and the value
becomes a build-time constant.

## Seat status

Computed on the client for the chosen `date`, `slot` selection and current user. Evaluated
top to bottom; the first match wins.

Let `slots` be `[am, pm]` when the chosen slot is a full day, otherwise the single chosen
slot. Let `bookings` be the Booking rows for this seat and date whose slot is in `slots`.

| Order | Condition | Status | Meaning |
|---|---|---|---|
| 1 | bookable-area switch is `east` and seat.part is `west` | `off` | Not bookable in this setting. Excluded from counts and from team search. Not selectable. |
| 2 | seat has a Dedication and (switch is `locked`, or no Release exists for this date) and owner is me | `dedmine` | Your dedicated seat |
| 3 | same as 2 but owner is someone else | `ded` | Dedicated |
| 4 | some booking in `bookings` has `by == me` | `mine` | Booked by you |
| 5 | `bookings` is empty | `free` | Free |
| 6 | `bookings.length < slots.length` | `partial` | Half taken (one half-day free) |
| 7 | otherwise | `taken` | Taken |

A released dedicated seat (owner released it for this date, switch is `release`) falls
through to rows 4 to 7 like any ordinary seat.

## Available actions per status

| Status | Actions for the current user |
|---|---|
| free | Book this seat |
| partial | Book the free half |
| mine | Cancel my booking |
| dedmine | Release for this day / Take my seat back (0002 release only). Take back is disabled while someone else holds a booking that day. |
| ded, taken | none (admin: Remove dedication on `ded`) |
| off | none; selecting shows an explanation referencing O-12 |
| any except off, admin only | Make dedicated / Remove dedication |

All write actions are disabled when the user lacks write permission (R-25).

## Display names

- A booking's occupant is shown as `label` if present and `by == bookedBy`; otherwise the
  resolved name of `by`; "you" when `by` is the current user.
- Simulated fixture bookings (`fixtures/simulated-bookings.json`) have no real occupant. They
  are shown with a deterministic placeholder name followed by "(simulated)" and are never
  attributed to a real user.

## Invariants (must be enforced server-side)

1. Unique `(date, slot, seat)` across Bookings.
2. `seat` exists in the floor plan for every entity.
3. A Booking cannot be created for a seat with a Dedication unless the requester is the
   owner, or a Release for that date exists and decision 0002 is `release`.
4. A Release can only be written by the current dedication owner.
5. A Dedication can only be written or deleted by an admin.
6. `date` must be today or later (office time zone) for new Bookings and Releases.
7. `label` is only accepted when `by == bookedBy`.
