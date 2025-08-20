# ADR-001: Adopt a Monorepo for the Debrief Ecosystem

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

The ecosystem comprises multiple components (React Map Tools, VS Code extensions, ToolVault Python server, Custom STAC server, Browser FC renderer, and Storage-Format schemas). 
A single maintainer coordinates development; external contributors may submit PRs but there is no separate organisation owning subparts.


## Decision

Use a **single Git repository (monorepo)** to host all components. Projects are isolated by directory and tooling, but share common CI, governance, and release infrastructure.


## Consequences

- Easier cross-cutting changes and shared conventions.
- Single place to onboard, search, and version.
- CI must scale to polyglot builds.
- Risk of repo size growth; mitigated with per-component caching and artifacts.


## Alternatives Considered

- Multi-repo (adds overhead for a sole maintainer).
- Nested submodules (complex DX).


## References
REPO_STRATEGY.md
