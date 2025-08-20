# ADR-007: Hybrid Onboarding (Bootstrap Script + Per-Component READMEs)

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

New contributors need to set up Pants, Node, Python, and editor settings quickly, but shouldn’t be forced to install all component deps.


## Decision

Provide a **bootstrap script** for shared prerequisites and **per-component READMEs** for local specifics.


## Consequences

- Faster ramp-up with minimal bloat.
- Clear boundaries for component ownership.


## Alternatives Considered

- One huge installer (heavyweight, brittle).


## References
-
