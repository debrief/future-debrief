# ADR-011: Storage Format in Monorepo with Strict SemVer

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Multiple components consume shared JSON Schemas for FeatureCollections and extensions. We require one source of truth and clear compatibility.


## Decision

Keep **Debrief Storage Format** (schemas) inside the monorepo under `/storage-format/` with **strict SemVer**. Extensions (`ui`, `audit`, `storyboard`, etc.) live alongside core.


## Consequences

- Single authoritative location.
- Clear upgrade rules and changelogs.


## Alternatives Considered

- Separate repo (added coordination overhead).


## References
-
