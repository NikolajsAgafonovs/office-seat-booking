# 0008 Persistence
Status: proposed
Requirement: R-10, R-26, R-30, domain-model invariants
Date: 2026-10-14

## Question
Where do bookings, dedications and releases live?

## Options
1. **PostgreSQL with Prisma** (proposed). Unique constraint on `(date, slot, seat)` gives
   R-10 for free. Migrations are generated from the Prisma schema, which is itself generated
   from `domain-model.md`.
2. SQLite for local development and tests, same Prisma schema, so no database server is
   needed on a laptop. Production stays on PostgreSQL.

## Decision (proposed)
Both: Prisma schema targets PostgreSQL; a `DATABASE_URL` pointing at SQLite is used by
default in development and in the test suite. Dates are stored as `DATE` columns (calendar
dates), never as timestamps (R-30).

## Consequences
`npm run db:migrate` and `npm run db:seed` (loads `docs/fixtures/simulated-bookings.json`
relative to today) are part of the generated scripts. Fixture bookings are stored with
`by = bookedBy = "sim"` and a `label` so they are recognisable and never attributed to a
real user. The seed is idempotent and clears previous simulated rows first.
