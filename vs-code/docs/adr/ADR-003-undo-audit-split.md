# ADR-003: Store undo and audit logs separately

## Status
Accepted

## Context
We want to support undo/redo as well as PROV-compatible audit logging. These have different scopes and lifetimes.

## Decision
Undo/redo will be tracked in memory via a per-document edit stack. Audit logs will be written to `properties.audit[]` inside the FeatureCollection.

## Consequences
- Undo history is temporary and runtime-only.
- Audit log persists and is user-visible.
- We may later add a UI to toggle audit logging per action.