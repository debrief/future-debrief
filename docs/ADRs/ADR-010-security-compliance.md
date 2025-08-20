# ADR-010: Automated Security and Licence Scans in CI

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Compliance risk must be managed continuously across JS/Python dependencies.


## Decision

Run **npm audit**, **pip-audit**, and licence checking on every PR; fail builds on high severity or non-approved licences.


## Consequences

- Early detection of risks.
- Occasional noise requiring triage.


## Alternatives Considered

- Periodic manual sweeps only (risk of drift).


## References
-
