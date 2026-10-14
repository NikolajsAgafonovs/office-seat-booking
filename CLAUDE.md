# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This is a documentation-driven project

Humans edit only `docs/`. Claude Code writes and maintains all code so that it matches the
documents. The documents are the specification and the source of truth; the code is a
derived artifact. Read `docs/README.md` first in every session.

Rules:

1. **Never change behaviour without a document that asks for it.** If the user asks for a
   feature, fix or tweak that is not covered by `docs/`, do not touch the code. Propose the
   documentation change instead (which file, which section, suggested wording), and apply
   it only after the user agrees. Then implement from the updated document.
2. **Cite the governing ID in code.** Every non-trivial function, component, route handler,
   schema field and test carries a short comment naming the requirement (`R-10`), decision
   (`0002`) or acceptance scenario (`A-06`) it exists for. If you cannot name one, the code
   should not exist.
3. **Docs win over the prototype, the prototype wins over your judgement.**
   `docs/reference/prototype.html` is reference material only. When the docs are silent,
   mirror the prototype. When both are silent, pick the simplest option, implement it, and
   flag the gap in your report so the team can document it.
4. **Data files are not regenerated.** `docs/floor-plan.json` and `docs/fixtures/*.json`
   are edited by humans or copied verbatim. Never re-derive, reorder or "clean" them.
5. **Open decisions become switches, settled ones become constants.** Follow
   `docs/decisions/README.md`. When a record changes status, remove or add the switch
   accordingly and delete the dead branch.
6. **Keep the docs honest.** If implementation reveals that a document is ambiguous,
   contradictory or wrong, do not silently pick an interpretation. Finish what is
   unambiguous, then report the exact sentence and the two readings. Never edit
   `docs/requirements.md` or `docs/decisions/` yourself; those are the team's.
   You may fix typos and broken links in other docs, and you must update this file's
   Commands section whenever scripts change.
7. **Every sync ends with a report**: which documents drove the change, which files
   changed, which acceptance scenarios are now covered or still missing, test results
   verbatim, and any doc gaps found.

Typical requests and what they mean:

- "sync" / "sync the code with the docs": diff the docs against the code, implement what
  is missing or changed, run lint and tests, report.
- "sync api.md" (or any one document): same, scoped to that document and what depends on it.
- "scaffold": first-time generation of the whole project per decision 0006. Only when no
  `package.json` exists yet.

## Toolchain

Node 24 and npm 11 on Windows 11. The shell is PowerShell 7: chain with `;` or `&&`, use
`$env:VAR`, not bash syntax. SQLite is the default local database (decision 0008); no
database server is needed on a laptop.

## Commands

All from the repository root unless noted.

```
npm install                          # once; also generates the Prisma client
cp .env.example server/.env          # once; dev defaults
npm run db:migrate -w server         # apply migrations (prisma migrate dev)
npm run db:seed                      # load docs/fixtures/simulated-bookings.json
npm run dev                          # server on :3000 and Vite client on :5173 together
npm run dev -w server                # server only (tsx watch)
npm run dev -w client                # client only
npm run build                        # typecheck + build every workspace
npm run typecheck                    # tsc --noEmit in every workspace
npm run lint                         # eslint .
npm run format                       # prettier --write .
npm test                             # all Vitest projects (shared, server, client)
npx vitest run --project server      # one workspace
npx vitest run server/src/test/bookings.test.ts -t "A-06"   # one test by file and name
npm run test:e2e                     # Playwright (client/e2e); needs `npx playwright install chromium` once
npm run db:reset                     # drop, migrate, reseed the local SQLite file (destructive, local only)
```

Notes:

- npm 11 blocks third-party install scripts until approved; the approvals for Prisma and
  esbuild are recorded in `package.json#allowScripts`. If a fresh clone prints "install
  scripts not yet covered", run `npm install-scripts approve <pkg>` for the named packages.
- The Prisma CLI refuses destructive commands (`--force-reset`, `migrate reset`) when it
  detects an AI agent. Do not work around that; ask the owner to run them.
- Server tests build one SQLite template with `prisma migrate deploy` in a global setup and
  copy it per test file, so they need the migrations in `server/prisma/migrations` to be
  current. After changing the schema run `npm run db:migrate -w server` and commit the
  migration.

## Architecture

npm workspaces, all TypeScript, ESM.

- `shared/` (`@seat/shared`): consumed as source, no build. Holds the domain vocabulary and
  API types (`types.ts`), Zod request schemas (`schemas.ts`), the seat-status table from
  `docs/domain-model.md` (`status.ts`), the "book together" finder from R-14 (`team.ts`),
  calendar-date helpers in the office time zone (`dates.ts`), and floor-plan validation
  (`floorPlan.ts`). Both sides must use these rather than reimplementing them, so the
  server's invariant checks and the client's colouring cannot drift.
- `server/`: Fastify 5. `app.ts` builds the app from an injectable context (config,
  Prisma client, user directory, event bus, clock) so tests can freeze "today" and use a
  throwaway database. Routes under `src/routes/` map one-to-one to the sections of
  `docs/api.md`. Errors are thrown as `ApiHttpError` and rendered by one error handler
  into the documented envelope. Identity is a signed session cookie plus a `Directory`
  interface; only the dev provider (fixture users) exists, per decision 0007. Roles come
  from `ADMIN_USERS` / `READONLY_USERS` (decision 0004). Live updates are Server-Sent
  Events from `events.ts`, published by the write routes. Uniqueness of
  `(date, slot, seat)` is a database constraint; the booking route treats a unique
  violation as "lost", never as an error (R-10, R-17). Dates are stored as `YYYY-MM-DD`
  strings (R-30).
- `client/`: React 19 + Vite, one page, Zustand store, plain CSS with the tokens from
  `docs/ui.md`. Fetches the plan and the chosen day, derives status with the shared
  function, patches state from SSE, keeps the open-question switches in `localStorage`.
  When `/api/me` is 401 in dev mode it shows a fixture-user sign-in card.
- Tests: Vitest projects per workspace (root `vitest.config.ts`), Playwright in
  `client/e2e`. Test names carry the acceptance scenario ID (`A-06`), so
  `docs/acceptance.md` can be checked against `npx vitest run --reporter verbose`.
