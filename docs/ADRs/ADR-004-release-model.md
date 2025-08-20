# ADR-004: Hybrid Release Model

## Context
We must support independent evolution of components while providing stable bundles for MOD/NATO.

## Decision
Adopt a **hybrid release model**:
- Each component has its own semantic versioning and independent releases.
- Periodic **umbrella releases** snapshot the entire ecosystem.

## Rationale
- Allows fast, independent iteration for developers.
- Provides stable, certified bundles for MOD/NATO deployments.
- Quarterly cadence plus ad-hoc releases as needed.

## Consequences
- Requires careful tagging and release notes management.
- Consumers may mix component versions outside umbrella releases.
