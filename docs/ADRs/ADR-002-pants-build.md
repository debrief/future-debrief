# ADR-002: Use Pants as the Monorepo Build Orchestrator

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

We must build TypeScript/React, VS Code extensions, and Python services in one repo, supporting incremental builds and air‑gapped operation.


## Decision

Adopt **Pants (v2)** to orchestrate builds/tests across components while allowing native tooling (npm/pytest) for local dev. Pants runs in CI to coordinate targets and caches.


## Consequences

- Consistent entrypoints and caching across languages.
- Good Python ergonomics; adequate JS/TS support.
- Requires initial Pants configuration and target hygiene.


## Alternatives Considered

- Bazel (steeper curve, more hermetic; not needed now).
- Loose scripts only (slower CI, less reproducibility).


## References
https://www.pantsbuild.org/
