# Generated TypeScript Types

⚠️ **WARNING: These files are automatically generated. Do not edit them manually!**

## What's in this directory

This directory contains TypeScript type definitions that are automatically generated from JSON schemas during the build process.

## Source of truth

The files in this directory are generated from:

- **Maritime GeoJSON schemas**: `../../schema/*.schema.json`
  - `track.ts` ← `../../schema/track.schema.json` (re-export)
  - `point.ts` ← `../../schema/point.schema.json` (re-export)  
  - `annotation.ts` ← `../../schema/annotation.schema.json` (re-export)
  - `featurecollection.ts` ← `../../schema/featurecollection.schema.json`

- **Application state schemas**: `../../schemas/*.json`
  - `timestate.ts` ← `../../schemas/TimeState.json`
  - `viewportstate.ts` ← `../../schemas/ViewportState.json`
  - `selectionstate.ts` ← `../../schemas/SelectionState.json`
  - `editorstate.ts` ← `../../schemas/EditorState.json`
  - `currentstate.ts` ← `../../schemas/CurrentState.json`

## Generation process

1. **Command**: `pnpm generate:ts` generates these files using [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript)
2. **Tool**: json-schema-to-typescript converts JSON schemas to TypeScript interfaces
3. **Post-processing**: Re-export files are created to avoid duplication
4. **Build integration**: Files are generated automatically during build

## How to modify types

**To change these types, edit the source JSON schemas, not these TypeScript files:**

1. Edit the relevant `.json` schema file in `schema/` or `schemas/`
2. Run `pnpm generate:ts` to regenerate TypeScript types
3. Run `pnpm build` to rebuild the package

## Files that ARE safe to edit

- This `README.md` file - Documents the generation process

## Files that should NEVER be edited

- `*.ts` - These are completely regenerated from schemas

---

**Remember**: The JSON schemas in `schema/` and `schemas/` are the single source of truth for all type definitions!