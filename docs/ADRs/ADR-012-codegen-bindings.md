# ADR-012: Generate TS/Python Bindings from Schemas

- **Status:** Accepted
- **Date:** 2025-08-20
- **Deciders:** Project lead (Debrief ecosystem maintainer)
- **Tags:** repo, strategy

## Context

Consumers in TS (React tools, VS Code) and Python (ToolVault, STAC) need typed models and validators.


## Decision

On tagged releases, CI generates **lightweight** TS and Python bindings from schemas and publishes artifacts with the storage-format version. 
Bindings include validation helpers; convenience methods live in separate hand-written libs if needed.


## Consequences

- Consistent models across languages.
- Minimal generated code, easy to regen.


## Alternatives Considered

- Hand-written models (risk of drift).
- Rich generated methods (harder to maintain).


## References
-
