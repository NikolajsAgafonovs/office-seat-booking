# 0009 Hosting
Status: decided
Requirement: R-26, R-30, decision 0008
Date: 2026-10-14

## Question
Where does the application run, and how does a change reach it?

## Options
1. **Fly.io**, one app, one machine, SQLite on a persistent volume (chosen by the owner on
   2026-10-14).
2. Fly.io with Fly Postgres. Rejected for now: it needs the PostgreSQL schema copy from
   decision 0008 and a second database to operate, for a floor of about 170 seats.
3. A container platform inside the organisation. Not available at this point.

## Decision
The project runs on **Fly.io** as a single app named `office-seat-booking` in region `arn`
(Stockholm, nearest to the office). One Docker image serves both the API and the built
client from the Fastify server on port 3000. Data lives in SQLite on a Fly volume mounted
at `/data` (`DATABASE_URL=file:/data/seat.db`), which keeps decision 0008's local setup and
production identical.

## Consequences
- **Exactly one machine.** The live-update bus (R-26) is in-process and SQLite is a file,
  so the app must not scale horizontally. `fly.toml` pins one machine, keeps it running
  (`min_machines_running = 1`, no auto-stop) so Server-Sent Events connections stay open,
  and disables request concurrency limits that would start a second machine.
- **Migrations run at container start**, not as a Fly release command: release commands
  run on a temporary machine without the volume. The container entrypoint runs
  `prisma migrate deploy` against `/data/seat.db` and then starts the server. The Prisma CLI
  is therefore part of the production image.
- **Static client.** The server serves `client/dist` at `/` with a single-page fallback for
  any path that is not under `/api`. Requests under `/api` that match no route still return
  the JSON `not_found` envelope.
- **Health check.** `GET /api/health` returns `{ "ok": true }` without a session and is the
  Fly HTTP check.
- **Behind the Fly proxy** TLS terminates at the edge. The server trusts the proxy headers
  and marks the session cookie `Secure` when `NODE_ENV=production`.
- **Secrets** (`fly secrets set`): `COOKIE_SECRET` (required, random, at least 32 bytes).
  Plain configuration in `fly.toml` `[env]`: `AUTH_MODE`, `OFFICE_TZ`, `ADMIN_USERS`,
  `READONLY_USERS`, `FLOOR_PLAN_PATH`, `DATABASE_URL`, `NODE_ENV`.
- **Delivery.** A GitHub Actions workflow deploys every push to `main` with
  `flyctl deploy --remote-only`, authenticated by the `FLY_API_TOKEN` repository secret.
  Pull requests only run CI. Nothing deploys from a laptop except the first `fly launch`.
- **Seeding** is manual and optional:
  `fly ssh console -C "node /app/server/dist/seed.js"` loads the simulated bookings for
  demos.
- **Server build** is an esbuild bundle (`server/dist/server.js`, `server/dist/seed.js`)
  that inlines `@seat/shared`, because the shared package is consumed as TypeScript source
  and has no runtime artefact of its own. `tsc` remains the type checker.
- **Not production-ready for people.** Until decision 0007 settles real sign-in, the
  deployed app uses the development identity provider: anyone who opens the URL can act
  as any fixture user. Treat the Fly app as a shared demo stage and do not publish its
  address beyond the team. Settling 0007 and switching `AUTH_MODE` is the gate for real
  use.
- **Backups.** Fly volumes take daily snapshots retained for five days. Good enough for a
  demo stage; revisit with 0007.

## First-time setup (owner, once)
```
fly launch --no-deploy --copy-config --name office-seat-booking --region arn
fly volumes create seat_data --region arn --size 1
fly secrets set COOKIE_SECRET=<random 48+ characters>
fly deploy
fly tokens create deploy --name github-actions-deploy --expiry 8760h | gh secret set FLY_API_TOKEN
```

The deploy token is app-scoped and expires after one year (created 2026-10-14, expires
2027-10-14). Renew it with the same command before it expires; `fly tokens list` shows the
date. The workflow can also be run by hand from the Actions tab (`workflow_dispatch`).
