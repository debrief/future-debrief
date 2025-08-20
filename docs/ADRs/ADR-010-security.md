# ADR-010: Security & Compliance

## Context
Need to ensure dependencies and licences are continuously verified for compliance.

## Decision
Implement **automated scans in CI**:  
- `npm audit` for Node/TypeScript projects.  
- `pip-audit` for Python projects.  
- Licence checkers for both ecosystems.  
- Fail builds on high-severity issues or non-approved licences.  

## Rationale
- Continuous compliance reduces risk.  
- Fast feedback for developers.  
- Aligns with MOD/DSTL security expectations.  

## Consequences
- CI pipelines may break due to new vulnerabilities.  
- Requires timely triage and remediation.  
