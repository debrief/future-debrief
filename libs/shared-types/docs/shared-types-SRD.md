
# Software Requirements Document
**Project:** Shared Types for Debrief Ecosystem
**Version:** 0.1
**Date:** 2025-08-30

## 1. Purpose
The Shared Types project defines common data structures used between Debrief subsystems. Its goal is to provide a single, authoritative definition of types—particularly constrained **GeoJSON FeatureCollections**—with aligned TypeScript and Python representations.

## 2. Scope
The shared types will:
- Constrain GeoJSON FeatureCollections for maritime analysis.
- Define a Track type (`LineString`/`MultiLineString`) with required metadata.
- Provide JSON Schemas as the **master definition**.
- Generate corresponding TypeScript and Python types.
- Supply language-specific validators to enforce semantic checks beyond JSON Schema.

The project does not cover UI logic, persistence, or business processes. It strictly defines **data shape and validation**.

## 3. Functional Requirements

### 3.1 Master Schema Format
- JSON Schema (Draft 2020-12).
- Semantic versioning in `$id` field (e.g. `…/debrief.schema.json#1.0.0`).

### 3.2 Debrief schema
- Must conform to GeoJSON `FeatureCollection`.
- All child features should have id properties at root level of feature

### 3.3 Track Schema
- Each `feature` must be `LineString` or `MultiLineString`
- Optional property: `timestamps[]` array of ISO-8601 strings.
- Schema enforces `timestamps[]` presence and type, but alignment with coordinates is handled by validators.

### 3.4 Point Schema
- Each `feature` must be `Point
- Optional property: `time` (for instantaneous event), or `timeStart` and `timeEnd` for period events, which are ISO-8601 strings.

### 3.5 Validators
- Provide TypeScript validator functions (Ajv + custom checks).
- Provide Python validator functions (Pydantic + custom checks).
- Custom rules include: `timestamps[]` length must equal `geometry.coordinates[]` length.

### 3.6 Packaging
- TypeScript package published to npm.
- Python package published to PyPI.
- Both packages include JSON Schemas and validators.

### 3.7 Organisation
- Modular schemas: `track.schema.json`, `event.schema.json`, `annotation.schema.json`.
- Top-level `featurecollection.schema.json` references each type.
- FeatureCollections may contain a **mix** of feature types.

## 4. Non-Functional Requirements
- Portability: schemas must be usable by any JSON Schema–compliant tool.
- Extensibility: new feature schemas can be added without breaking existing ones.
- Consistency: TypeScript and Python validators must align in logic and behaviour.
- Versioning: semantic versioning of schemas and language packages.

## 5. Deliverables
- JSON Schemas for core feature types.
- Generated TypeScript interfaces and validators.
- Generated Python dataclasses/Pydantic models and validators.
- Reference documentation on schema usage.

## 6. Risks and Mitigations
- **Risk:** JSON Schema cannot enforce cross-field constraints.  
  **Mitigation:** Implement cross-field checks in validators.  
- **Risk:** Drift between TS and Python validators.  
  **Mitigation:** Centralise in monorepo, CI tests for parity.  

## 7. Acceptance Criteria
- Schema validation passes for valid FeatureCollections.  
- Invalid FeatureCollections rejected by both TS and Python validators.  
- Packaging and installation tested in both npm and PyPI environments.  
