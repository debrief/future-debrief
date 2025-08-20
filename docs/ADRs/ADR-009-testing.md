# ADR-009: Per-Component Testing Only (for now)

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

CI time must remain reasonable; components have clear boundaries.


## Decision

Keep **unit and integration tests inside each component**. Umbrella releases bundle tested components without extra cross-ecosystem tests initially.


## Consequences

- Faster CI, simpler ownership.
- Cross-integration issues may surface during manual validation; can be added later if needed.


## Alternatives Considered

- Full end-to-end umbrella tests (heavier CI).


## References
-
