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
