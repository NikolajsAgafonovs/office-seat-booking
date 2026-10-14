# 0006 Technology stack
Status: proposed
Requirement: all
Date: 2026-10-14

## Question
What does Claude Code generate the application with?

## Options
Considered: Vite + React vs Next.js for the client; Express vs Fastify for the server;
JavaScript vs TypeScript.

## Decision (proposed, confirm with the team)
- Monorepo with npm workspaces: `client/`, `server/`, `shared/`.
- **Client**: React 18+, TypeScript, Vite. No UI component library; plain CSS with the
  tokens from `ui.md`. State: React state plus a small store (Zustand) for map data.
- **Server**: Node 24, TypeScript, Fastify. Request validation with Zod schemas that live
  in `shared/` and are reused by the client.
- **Shared**: types, Zod schemas, seat-status derivation (so server tests and client agree),
  date helpers.
- **Tests**: Vitest everywhere; Playwright for the (e2e) scenarios in `acceptance.md`.
- **Lint/format**: ESLint (typescript-eslint, react-hooks) and Prettier, enforced in CI.
- **Live updates**: Server-Sent Events as in `api.md`.
- Node version pinned in `.nvmrc` and `package.json` engines.

## Consequences
`CLAUDE.md` lists the resulting commands once the scaffold exists. Any deviation (for
example polling instead of SSE) is recorded here as an amendment with a date.
