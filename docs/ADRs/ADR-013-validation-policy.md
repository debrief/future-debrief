# ADR-013: Strict in CI, Tolerant at Runtime

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Operational environments may have imperfect data; developers need strict guarantees.


## Decision

CI enforces **strict** schema validation. Runtime libraries **load tolerantly**, logging warnings for non-critical issues, to avoid blocking analysts.


## Consequences

- Robust pipelines; forgiving UX.
- Requires clear warning messages and telemetry.


## Alternatives Considered

- Strict everywhere (blocks field use).
- Fully lenient (risks silent data issues).


## References
-
