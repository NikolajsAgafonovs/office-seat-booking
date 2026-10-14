# API contract

HTTP JSON API served by the Node backend under `/api`. The React client is the only
consumer. All endpoints require an authenticated session (decision 0007) unless marked
public. Dates are `YYYY-MM-DD`, slots are `"am"` or `"pm"`.

Errors use one shape: `{ "error": { "code": string, "message": string } }` with the HTTP
status in the table below. The client maps `code` to behaviour as described in `ui.md`.

| code | status | when |
|---|---|---|
| unauthenticated | 401 | no valid session |
| forbidden | 403 | authenticated but not allowed (read-only user, non-admin dedication, cancel of someone else's booking) |
| not_found | 404 | unknown seat, booking, dedication or release |
| conflict | 409 | seat/date/slot already booked, or dedication rules block the write |
| invalid_argument | 400 | bad date, slot, seat code, past date, label with a colleague |
| quota_exceeded | 429 | storage or rate limit |

## Identity

### GET /api/me
Returns the current user and permissions.
```
{ "id": string, "name": string, "avatarUrl": string, "canWrite": boolean, "isAdmin": boolean }
```

### GET /api/users?q=
Directory search for team booking (R-24). Minimum 1 character. Returns at most 10.
```
[{ "id": string, "name": string, "avatarUrl": string, "isMe": boolean }]
```

### POST /api/users/resolve
Body `{ "ids": [string] }`. Returns `{ [id]: { "id", "name", "avatarUrl" } }` for display of
occupants and owners. Unknown ids are omitted.

## Floor plan

### GET /api/floor-plan
Returns `docs/floor-plan.json` verbatim. Public within the authenticated app. Cacheable.

## Bookings

### GET /api/bookings?date=
All bookings for one date (R-3, R-5). Also returns the releases for that date so one call
paints the map.
```
{
  "bookings": [{ "id": string, "date", "slot", "seat", "by", "bookedBy", "label"?, "createdAt" }],
  "releases": [{ "date", "seat", "by" }]
}
```
`id` is `date_slot_seat`, the natural key, so the client can address rows without a lookup.

### GET /api/bookings/mine
Bookings where `by` is the current user, today or later (R-11). Same booking shape, plus
`"dedications": [{ "seat", "owner" }]` for seats dedicated to the caller (R-19).

### POST /api/bookings
Create one or more bookings atomically **per item** (R-16, R-17): each item either fully
succeeds for all requested slots or is reported as lost. Items are independent of each other.
```
request:  { "date", "slots": ["am","pm"], "items": [{ "seat", "by"?: userId, "label"?: string }] }
response: { "booked": [{ "seat", "slots": [..] }], "lost": [seat] }
```
- `by` defaults to the caller. If present and not the caller, `label` must be absent
  (invariant 7).
- A slot that is already booked is skipped silently; the item counts as booked if at least
  one slot was obtained and as lost if none were. This mirrors "Book the free half" (R-7).
- Uniqueness is enforced by the database constraint. On a constraint violation the server
  retries nothing and reports the seat as lost. It never returns 409 for a lost seat inside
  a multi-item request; 409 is only for a single-item request, so the client can show the
  seat-specific message either way.
- Rejects with `conflict` when the seat has a dedication the caller may not override
  (invariant 3).

### DELETE /api/bookings/:id
Cancel one slot booking (R-8). Allowed for `by` or `bookedBy`. Idempotent: deleting a
missing booking returns 204.

## Dedications

### GET /api/dedications
All dedications: `[{ "seat", "owner" }]`.

### PUT /api/dedications/:seat
Admin only (R-21). Body `{ "owner": userId }`. Replaces any existing owner.

### DELETE /api/dedications/:seat
Admin only. 204.

## Releases

### PUT /api/releases/:date/:seat
Dedication owner only (R-20). Body empty. 204. `forbidden` if the caller is not the owner.
Rejected with `conflict` when decision 0002 is `locked` (server reads the settled value; while
the decision is open the server accepts the write and the client decides whether to show
the control).

### DELETE /api/releases/:date/:seat
Take the seat back. Owner only. `conflict` if someone else holds a booking for that seat
and date.

## Live updates (R-26)

### GET /api/events
Server-Sent Events stream. One event per change, each carrying only what changed so the
client can patch local state:
```
event: booking       data: { "op": "set"|"delete", "id", "booking"? }
event: release       data: { "op": "set"|"delete", "date", "seat", "release"? }
event: dedication    data: { "op": "set"|"delete", "seat", "dedication"? }
```
The client reconnects with exponential backoff and refetches the current date on reconnect.
A polling fallback every 15 seconds is acceptable if SSE cannot be deployed; document the
choice in decision 0006 if so.

## Permissions summary

| Action | Employee | Read-only | Admin |
|---|---|---|---|
| read anything | yes | yes | yes |
| create booking for self or colleague | yes | no | yes |
| cancel booking | if by or bookedBy | no | if by or bookedBy |
| release / take back own dedicated seat | yes | no | yes |
| set / remove dedication | no | no | yes |

## Operations (decision 0009)

### GET /api/health
Public, no session. Returns `{ "ok": true }` once the server is listening. Used as the
host's HTTP check. It does not touch the database.

### Static client
In deployed environments the same server serves the built client: `GET /` and any `GET` or
`HEAD` path that is not under `/api` and matches no file returns `index.html`, so client-side
routes survive a reload. Hashed files under `/assets/` are sent with
`Cache-Control: public, max-age=31536000, immutable`; `index.html` is never cached. Unknown
paths under `/api` keep returning the JSON `not_found` envelope, whatever the method.
