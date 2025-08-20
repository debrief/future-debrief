# ADR-004: Support legacy file types via import-on-open

## Status
Accepted

## Context
Users have `.rep` and `.dpf` files. We want them to open these directly in the editor, but not edit them in native format.

## Decision
We register `.rep` and `.dpf` as supported file types in the custom editor. When opened, we invoke a ToolVault-powered importer and create a new `.geojson` document.

## Consequences
- Analysts can double-click legacy files to start analysis.
- Original files remain untouched.
- Editors always operate on `.geojson` files.