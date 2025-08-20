# ADR-005: Packaging & Distribution via Artifact Bundles and Workbench Build

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Air‑gapped MOD/DSTL/NATO environments rely on internal file shares. Analysts benefit from a pre-packaged desktop environment.


## Decision

Produce **artifact bundles (zip/tar)** per umbrella release containing npm tgz, Python wheels, VSIX, schemas, and docs. 
Additionally ship a **Debrief Workbench** (VS Code distribution with extensions + Python tools).


## Consequences

- Works without registries; easy to mirror internally.
- Larger bundle sizes; scripted installers recommended.


## Alternatives Considered

- Internal registries (Nexus/Artifactory)—deferred.
- Public marketplaces—unsuitable for MOD constraints.


## References
-
