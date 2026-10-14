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
Prisma with SQLite for local development and the test suite; PostgreSQL in deployed
environments. Dates are stored as `YYYY-MM-DD` strings (calendar dates in the office time
zone, R-30), never as timestamps, so the same model works on both databases.

### Amendment 2026-10-14
The first draft said "the Prisma schema targets PostgreSQL and a `DATABASE_URL` pointing at
SQLite is used in development". Prisma fixes the provider in the schema file, so that is not
possible. The committed schema and migrations use `provider = "sqlite"`. Deploying to
PostgreSQL requires a schema copy with `provider = "postgresql"` and its own migration
history; that is a separate sync when a deployment target exists. Until then nothing in
the code may depend on SQLite-only behaviour beyond what Prisma abstracts.

## Consequences
`npm run db:migrate` and `npm run db:seed` (loads `docs/fixtures/simulated-bookings.json`
relative to today) are part of the generated scripts. Fixture bookings are stored with
`by = bookedBy = "sim"` and a `label` so they are recognisable and never attributed to a
real user. The seed is idempotent and clears previous simulated rows first.

The Prisma CLI refuses destructive commands (`migrate reset`, `db push --force-reset`) when
it detects an AI agent. Those commands are run by a person; Claude Code never works around
the guard. Tests therefore build their database with the non-destructive `migrate deploy`,
which means the committed migrations must always match the schema.
