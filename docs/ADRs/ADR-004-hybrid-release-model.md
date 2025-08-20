# ADR-004: Hybrid Release Model (Per-Component + Umbrella)

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Consumers vary: developers prefer independent component versions; MOD/DSTL want certified bundles.


## Decision

Each component keeps its own **SemVer** and publishes independently. Periodically cut **umbrella releases** (tagged at repo root) that snapshot a certified set.


## Consequences

- Flexibility for devs; predictability for stakeholders.
- Requires release coordination and notes at umbrella time.


## Alternatives Considered

- Single shared version for all (inflexible).
- Only per-component (hard to certify end-to-end).


## References
-
