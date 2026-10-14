# Decision records

One file per decision, numbered, never deleted. Format:

```
# NNNN Title
Status: open | proposed | decided | superseded by NNNN
Requirement: O-x / R-x
Date: YYYY-MM-DD (last status change)

## Question
## Options
## Decision        (empty while open; the chosen option when decided)
## Consequences    (what the code must do; for open ones: how the switch behaves)
```

Rules:

- **Open** decisions that affect user-visible behaviour are implemented as a per-user
  runtime switch in the settings strip (see `ui.md`), defaulting to the first listed option.
- **Proposed** decisions are implemented as if decided; the record says who needs to confirm.
- **Decided**: the switch is removed, the value is a constant, and the code comment cites the
  record.
- To change a decided record, add a new record and mark the old one superseded.

| # | Title | Status |
|---|---|---|
| 0001 | Booking slot size (O-1) | open |
| 0002 | Dedicated seat on the owner's day off (O-2) | open |
| 0003 | Bookable part of the floor (O-12) | open |
| 0004 | Admin role (O-7) | open |
| 0005 | Seat codes (O-13) | open |
| 0006 | Technology stack | proposed |
| 0007 | Identity provider | proposed |
| 0008 | Persistence | proposed |
