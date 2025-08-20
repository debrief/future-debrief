# ADR-014: Persist Viewport and Time Window in FeatureCollection

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Exports and reproducibility require sharing the analyst’s current perspective; re-opening should restore the same view.


## Decision

Persist **viewport** and **timeWindow** under `featureCollection.properties.ui.*` on save. Exporters/readers rely on these values by default.


## Consequences

- Reproducibility and consistent exports.
- Slightly larger FC files; must namespace to avoid clashes.


## Alternatives Considered

- Pass as transient params only (context lost on reopen).


## References
-
