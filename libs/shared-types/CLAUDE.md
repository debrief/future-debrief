# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The `@debrief/shared-types` package provides schema-driven type generation for maritime GeoJSON features and application state. It serves as the foundation for type consistency across TypeScript and Python codebases in the Debrief ecosystem.

## Development Commands

### Essential Commands
```bash
# Conditional build system (automatically detects changes)
pnpm build:status          # Check what would be rebuilt and why
pnpm build                 # Smart conditional build (only builds what changed)
pnpm build:ci              # Clean build for CI/CD environments

# Generate all types from Pydantic models (most important command)
pnpm generate:types

# Development with watch mode
pnpm dev    # Watches pydantic_models/ directory for changes

# Testing
pnpm test                  # Run all tests
pnpm test:generated        # Test generated files exist
pnpm test:validators       # Test validation functions
pnpm test:schemas         # Test JSON schema validation

# Type checking and linting
pnpm typecheck            # TypeScript type check
pnpm lint                 # ESLint + typecheck
```

### Conditional Build Performance
The package includes an intelligent conditional build system for improved developer productivity:
- **No changes**: ~1.5 seconds (85% improvement over unconditional build)
- **Pydantic model changes**: Full regeneration (~13 seconds)
- **Source changes**: Compilation only (~3.5 seconds)

### Package-Specific Commands
```bash
# Generate only TypeScript types
pnpm generate:ts

# Generate only Python types  
pnpm generate:python

# Clean generated files
pnpm clean

# Smart clean (only if Pydantic models changed)
pnpm clean:smart
```

## Architecture

### Pydantic-First Type Generation

This package follows a **Pydantic-first type generation approach** where Pydantic models are the single source of truth:

```
Pydantic Models (python-src/debrief/types/) → JSON Schema (derived/json-schema/) → TypeScript types (derived/typescript/ + src/types/)
```

**Critical**: Generated files are placed in language-specific directories and are excluded from version control. All types must be regenerated on build from Pydantic models.

### Directory Structure

**For detailed package structure information, see [README.md](README.md#package-structure).**

Key directories:
- `python-src/debrief/types/` - Pydantic model source files (single source of truth)
- `derived/json-schema/` - Generated JSON Schema files
- `derived/typescript/` - Generated TypeScript types
- `src/types/` - Generated TypeScript interfaces (compatibility)
- `src/validators/` - Manual validation functions

### Key Design Principles

1. **Pydantic-First**: Pydantic models are authoritative, all other artifacts are derived
2. **Discriminated Unions**: TypeScript uses `json-schema-to-typescript` for proper union types with literal discriminators (e.g., `dataType: "track"`)
3. **Cross-Field Validation**: Manual validators handle logic beyond schema capabilities (timestamp array length matching coordinates, geographic bounds, etc.)
4. **Type Safety**: Pydantic provides runtime validation and type checking at the source
5. **Build Dependencies**: Always run `pnpm generate:types` before TypeScript compilation

### Type Generation Details

**Pydantic Models**:
- Define data structures with runtime validation
- Support complex types, unions, and constraints
- Provide automatic JSON schema generation
- Enable type-safe Python development

**Generated JSON Schema**:
- Derived automatically from Pydantic models
- Used for validation and documentation
- Compatible with existing tooling

**Generated TypeScript** (`json-schema-to-typescript`):
- Creates discriminated unions with literal types
- Enables automatic type narrowing in consuming code
- Generates interfaces with proper inheritance relationships

## Development Workflow

### Making Model Changes
1. Edit Pydantic models in `python-src/debrief/types/features/`, `python-src/debrief/types/states/`, or `python-src/debrief/types/tools/`
2. Run `pnpm generate:types` to regenerate JSON Schema and TypeScript types
3. Update validators if cross-field validation logic changes
4. Run `pnpm typecheck` to ensure TypeScript compatibility
5. Build consuming packages that depend on changed types

### Adding New Feature Types
1. Create new Pydantic model file in `python-src/debrief/types/features/`
2. Add to `python-src/debrief/types/__init__.py` exports
3. Update `generate_from_pydantic.py` to include the new model
4. Create corresponding validator files in `src/validators/`
5. Add test data and update tests as needed

### Working with Generated Types

**TypeScript**: Import directly from generated files
```typescript
import { DebriefTrackFeature } from './src/types/featurecollection';
import { TimeState } from './src/types/timestate';
```

**From consuming packages** (like `../../apps/vs-code`):
```typescript
// State types (generated from pydantic_models/states/)
import { TimeState } from '@debrief/shared-types/src/types/timestate';
import { ViewportState } from '@debrief/shared-types/src/types/viewportstate';
import { SelectionState } from '@debrief/shared-types/src/types/selectionstate';
import { EditorState } from '@debrief/shared-types/src/types/editorstate';
import { CurrentState } from '@debrief/shared-types/src/types/currentstate';

// Feature types (generated from pydantic_models/features/)
import { DebriefFeatureCollection, DebriefFeature } from '@debrief/shared-types/src/types/featurecollection';

// Tool types (generated from pydantic_models/tools/)
import { ToolIndexModel, GlobalToolIndexModel } from '@debrief/shared-types/src/types/tools';

// Validators
import { validateFeatureCollectionComprehensive, validateFeatureByType, classifyFeature } from '@debrief/shared-types/src/validators';
```

**Python**: Import from generated modules
```python
from debrief.types.track import TrackFeature
from debrief.types.TimeState import TimeState
```

### Validation Strategy

- **JSON Schema validation**: Basic structure and format validation
- **Manual validators**: Cross-field validation (coordinate/timestamp alignment, geographic bounds, etc.)
- **Test coverage**: Each validator tested with valid/invalid data samples

## Common Issues

### Build Failures
- Ensure Pydantic models are valid before running type generation
- Check that all model imports and dependencies are correct
- Verify Node.js >=16.0.0 and Python >=3.8

### Type Inconsistencies
- Always regenerate types after Pydantic model changes: `pnpm generate:types`
- Check that TypeScript and Python validators handle equivalent cases
- Ensure test data covers edge cases for both languages

### Import Errors
- Remember this is a source package - import from specific directories
- Generated files in `src/types/` and `python-src/debrief/types/` must exist before importing
- Run `pnpm build` if generated directories are missing

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