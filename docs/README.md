# Documentation index

This project is **documentation-driven**. The files in `docs/` are the only thing humans
edit. All application code is generated and maintained by Claude Code to match these
documents. See the root `CLAUDE.md` for the operating rules.

| Document | What it governs |
|---|---|
| [requirements.md](requirements.md) | Functional and non-functional requirements with stable IDs (R-, O-, C-) |
| [decisions/](decisions/) | One record per open or settled decision. Open ones are implemented as runtime switches. |
| [domain-model.md](domain-model.md) | Entities, keys, seat status derivation, invariants |
| [floor-plan.md](floor-plan.md) + [floor-plan.json](floor-plan.json) | Seat and room geometry. Data, never regenerated. |
| [api.md](api.md) | HTTP contract between the React client and the Node server |
| [ui.md](ui.md) | Screens, components, behaviours, visual language |
| [acceptance.md](acceptance.md) | Scenarios every generated test suite must cover |
| [fixtures/](fixtures/) | Seed data for local development and demos |
| [reference/prototype.html](reference/prototype.html) | The original single-file prototype (requirements v0.2). Visual and behavioural reference only. Not a source of truth where it conflicts with the docs above. |

## Provenance

The prototype was built from "requirements v0.2" and a September 2025 floor plan slide.
Neither source document is in this repository yet. `requirements.md` was reverse-engineered
from the prototype on 2026-10-14 and must be reconciled against the real v0.2 document
when it is added. Items known only by ID from the prototype are marked `[from prototype]`.

## How a change flows

1. A human edits a document here (or adds a decision record).
2. Claude Code is asked to "sync the code with the docs" (or with a named document).
3. Claude Code reads the changed documents, patches the code, cites the governing
   requirement or decision ID in a comment next to the change, runs the test suite, and
   reports what changed and what it could not satisfy.
4. If a requested behaviour has no home in the docs, the answer is a documentation
   change first, never a direct code change.
