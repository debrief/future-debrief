# ADR-003: Use GitHub Actions for CI/CD

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

We need hosted CI that integrates with GitHub, supports matrix builds, caching, and artifact publishing. Later mirroring to on‑prem is possible.


## Decision

Standardise on **GitHub Actions** for builds, tests, audits, and publishing artifacts on tags.


## Consequences

- Tight GitHub integration and caching.
- Easy to share artifacts and release bundles.
- On‑prem mirroring deferred; workflows remain portable.


## Alternatives Considered

- GitLab CI / Azure DevOps / Jenkins.


## References
https://docs.github.com/actions
