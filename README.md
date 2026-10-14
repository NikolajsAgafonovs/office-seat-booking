# Office seat booking

See which desks on the floor are free on a given day and book one, alone or together with
your team.

This repository is **documentation-driven**: people edit [`docs/`](docs/README.md), and
Claude Code generates and maintains the code to match. Read [`CLAUDE.md`](CLAUDE.md) for
the rules before changing anything.

## Run it locally

Requirements: Node 24 (`.nvmrc`), npm 11.

```bash
npm install
```

```bash
cp .env.example server/.env
```

```bash
npm run db:migrate -w server
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open <http://localhost:5173>. Sign in as one of the fixture users (Alice or Bob are
employees, Carol is an admin, Dan is read-only). The client is served by Vite and proxies
`/api` to the Fastify server on port 3000. Configuration lives in `server/.env`; see
[`.env.example`](.env.example) for every variable.

The seed loads simulated bookings for the next two weeks so the map is not empty. They are
marked "(simulated)" and belong to nobody.

## Layout

| Workspace | What it is                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `shared/` | Types, Zod schemas, seat-status derivation, team finder, date helpers. Imported by both sides.          |
| `server/` | Fastify API implementing [`docs/api.md`](docs/api.md) with Prisma on SQLite (PostgreSQL in deployment). |
| `client/` | React single page implementing [`docs/ui.md`](docs/ui.md).                                              |
| `docs/`   | The specification. Source of truth.                                                                     |

## Checks

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:e2e
```

End-to-end tests need the browser once: `npx playwright install chromium`. They start the
dev stack themselves if it is not already running.

## Deployment

The app runs on Fly.io as one machine with SQLite on a volume; see
[decision 0009](docs/decisions/0009-hosting.md) for the reasoning and the one-time setup.
Every push to `main` deploys through the GitHub Actions workflow `deploy.yml`, which needs
the `FLY_API_TOKEN` repository secret. The image is built from the root `Dockerfile`:
migrations run at container start, then Fastify serves the API and the built client on
port 3000.

To run the production build locally without Docker:

```bash
npm run build
```

```bash
CLIENT_DIST=../client/dist npm start -w server
```

The deployed app still uses the development sign-in (decision 0007 is open), so treat it as
a demo stage and keep its address inside the team.
