# 0004 Admin role
Status: open
Requirement: O-7, R-21
Date: 2026-10-14

## Question
Who may assign and remove dedicated seats, and how do they get that right?

## Options
1. **Configured list** (default while open). A list of user ids or emails in server
   configuration (`ADMIN_USERS` environment variable). Simple, no UI.
2. A group or role claim from the identity provider (see 0007).
3. Office managers self-service via a separate admin page.

## Decision
Open. Implement option 1 until decided.

## Consequences
`GET /api/me` returns `isAdmin`. Dedication endpoints check it. The client shows dedication
controls only when `isAdmin` is true, with the hint text from `ui.md`.
