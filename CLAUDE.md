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

No scaffold exists yet. After "scaffold", replace this section with the real scripts
(install, dev client, dev server, build, lint, test all, run a single test, db migrate,
db seed) and keep it current.

## Architecture (per decision 0006; update once code exists)

npm workspaces: `client/` (React, Vite, TypeScript), `server/` (Fastify, TypeScript,
Prisma), `shared/` (Zod schemas, types, seat-status derivation, date helpers used by both).
The server exposes the contract in `docs/api.md`, enforces the invariants in
`docs/domain-model.md`, and pushes changes over Server-Sent Events. The client renders the
single page in `docs/ui.md`, derives seat status locally with the shared function, and
keeps the open-question switches in `localStorage`. Tests map one-to-one to the scenarios
in `docs/acceptance.md`, with the scenario ID in each test name.
