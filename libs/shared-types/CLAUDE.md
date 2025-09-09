# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The `@debrief/shared-types` package provides schema-driven type generation for maritime GeoJSON features and application state. It serves as the foundation for type consistency across TypeScript and Python codebases in the Debrief ecosystem.

## Development Commands

### Essential Commands
```bash
# Generate all types from schemas (most important command)
pnpm generate:types

# Build everything (clean + generate + compile)
pnpm build

# Development with watch mode
pnpm dev    # Watches schema/ and schemas/ directories

# Testing
pnpm test                  # Run all tests
pnpm test:generated        # Test generated files exist
pnpm test:validators       # Test validation functions
pnpm test:schemas         # Test JSON schema validation

# Type checking and linting
pnpm typecheck            # TypeScript type check
pnpm lint                 # ESLint + typecheck
```

### Package-Specific Commands
```bash
# Generate only TypeScript types
pnpm generate:ts

# Generate only Python types  
pnpm generate:python

# Clean generated files
pnpm clean

# Smart clean (only if schemas changed)
pnpm clean:smart
```

## Architecture

### Schema-First Type Generation

This package follows a **build-based type generation approach** where JSON schemas are the single source of truth:

```
JSON Schema (schema/) → json-schema-to-typescript → TypeScript types (derived/typescript/)
JSON Schema (schemas/) → quicktype → Python types (derived/python/)
```

**Critical**: The `derived/` directory contains generated files and is excluded from version control. All types must be regenerated on build.

### Directory Structure

```
schema/                    # Maritime GeoJSON schemas
├── track.schema.json     # LineString/MultiLineString with timestamps
├── point.schema.json     # Point features with time properties  
├── annotation.schema.json # Multi-geometry annotations
└── featurecollection.schema.json # Collection schema with discriminated unions

schemas/                   # Application state schemas
├── TimeState.json        # Time control state
├── ViewportState.json    # Map viewport state
├── SelectionState.json   # Feature selection state
├── EditorState.json      # Editor mode state
└── CurrentState.json     # Current vessel state

derived/                   # Generated types (not in git)
├── typescript/           # Generated TS interfaces
└── python/              # Generated Python classes

validators/               # Manual validation functions
├── typescript/          # TS validators with cross-field logic
└── python/             # Python validators (equivalent logic)
```

### Key Design Principles

1. **Schema-First**: JSON schemas are authoritative, types are derived
2. **Discriminated Unions**: TypeScript uses `json-schema-to-typescript` for proper union types with literal discriminators (e.g., `featureType: "track"`)
3. **Cross-Field Validation**: Manual validators handle logic beyond JSON schema capabilities (timestamp array length matching coordinates, geographic bounds, etc.)
4. **Language Parity**: TypeScript and Python validators provide equivalent behavior
5. **Build Dependencies**: Always run `pnpm generate:types` before TypeScript compilation

### Type Generation Details

**TypeScript Generation** (`json-schema-to-typescript`):
- Creates discriminated unions with literal types
- Enables automatic type narrowing in consuming code
- Generates interfaces with proper inheritance relationships

**Python Generation** (`quicktype`):
- Creates dataclasses with type annotations
- Generates factory methods and serialization support
- Compatible with Pydantic for runtime validation

## Development Workflow

### Making Schema Changes
1. Edit JSON schemas in `schema/` or `schemas/`
2. Run `pnpm generate:types` to regenerate derived types
3. Update validators if cross-field validation logic changes
4. Run `pnpm test` to ensure consistency across languages
5. Build consuming packages that depend on changed types

### Adding New Feature Types
1. Create new JSON schema file in `schema/`
2. Add schema reference to `featurecollection.schema.json` oneOf array
3. Add post-processing rules in `generate:ts:post-process` script if needed
4. Create corresponding validator files in both `validators/typescript/` and `validators/python/`
5. Add test data in `tests/json/data/`

### Working with Generated Types

**TypeScript**: Import directly from generated files
```typescript
import { DebriefTrackFeature } from './derived/typescript/featurecollection';
import { TimeState } from './derived/typescript/timestate';
```

**From consuming packages** (like `../../apps/vs-code`):
```typescript
// State types from schemas/
import { TimeState } from '@debrief/shared-types/derived/typescript/timestate';
import { ViewportState } from '@debrief/shared-types/derived/typescript/viewportstate';
import { SelectionState } from '@debrief/shared-types/derived/typescript/selectionstate';
import { EditorState } from '@debrief/shared-types/derived/typescript/editorstate';
import { CurrentState } from '@debrief/shared-types/derived/typescript/currentstate';

// Feature types from schema/
import { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types/derived/typescript/featurecollection';

// Validators 
import { validateFeatureCollectionComprehensive, validateFeatureByType, classifyFeature } from '@debrief/shared-types/validators/typescript';
```

**Python**: Import from generated modules
```python
from derived.python.track import TrackFeature
from derived.python.TimeState import TimeState
```

### Validation Strategy

- **JSON Schema validation**: Basic structure and format validation
- **Manual validators**: Cross-field validation (coordinate/timestamp alignment, geographic bounds, etc.)
- **Test coverage**: Each validator tested with valid/invalid data samples

## Common Issues

### Build Failures
- Ensure schemas are valid JSON before running type generation
- Check that all schema `$ref` dependencies exist
- Verify Node.js >=16.0.0 and Python >=3.8

### Type Inconsistencies
- Always regenerate types after schema changes: `pnpm generate:types`
- Check that TypeScript and Python validators handle equivalent cases
- Ensure test data covers edge cases for both languages

### Import Errors
- Remember this is a source package - import from specific directories
- Generated files in `derived/` must exist before importing
- Run `pnpm build` if `derived/` directory is missing

## Integration with VS Code Extension

The VS Code app (`../../apps/vs-code`) demonstrates the standard consumption pattern:

### Dependency Setup
The VS Code app does **not** list `@debrief/shared-types` in its `package.json` dependencies. Instead, it relies on the monorepo workspace structure and imports directly from the shared-types package paths.

### Common Import Patterns
- **Application state**: Import state types for managing UI component state (TimeState, ViewportState, SelectionState, EditorState, CurrentState)
- **Feature collections**: Import DebriefFeatureCollection and DebriefFeature for working with maritime GeoJSON data
- **Validation**: Import validators for runtime validation of user-provided GeoJSON data
- **Feature classification**: Import `classifyFeature` for determining feature types at runtime

### Build Dependencies
The VS Code extension build process (`pnpm build:shared-types`) must run before the VS Code build to ensure generated types are available. This is handled by the monorepo's Turborepo configuration which manages build order dependencies automatically.