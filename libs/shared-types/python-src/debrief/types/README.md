# Generated Python Types

⚠️ **WARNING: These files are automatically generated. Do not edit them manually!**

## What's in this directory

This directory contains Python type definitions that are automatically generated from JSON schemas during the build process.

## Source of truth

The files in this directory are generated from:

- **Maritime GeoJSON schemas**: `../../schema/*.schema.json`
  - `track.py` ← `../../schema/track.schema.json`
  - `point.py` ← `../../schema/point.schema.json`  
  - `annotation.py` ← `../../schema/annotation.schema.json`
  - `featurecollection.py` ← `../../schema/featurecollection.schema.json`

- **Application state schemas**: `../../schemas/*.json`
  - `TimeState.py` ← `../../schemas/TimeState.json`
  - `ViewportState.py` ← `../../schemas/ViewportState.json`
  - `SelectionState.py` ← `../../schemas/SelectionState.json`
  - `EditorState.py` ← `../../schemas/EditorState.json`

## Generation process

1. **Command**: `pnpm generate:python` generates these files using [quicktype](https://github.com/quicktype/quicktype)
2. **Tool**: quicktype converts JSON schemas to Python dataclasses
3. **Build integration**: Files are generated automatically during `python -m build`

## How to modify types

**To change these types, edit the source JSON schemas, not these Python files:**

1. Edit the relevant `.json` schema file in `schema/` or `schemas/`
2. Run `pnpm generate:python` to regenerate Python types
3. Run `pnpm build:python-wheel` to rebuild the wheel

## Files that ARE safe to edit

- `__init__.py` - Updated automatically but can be manually adjusted if needed
- This `README.md` file - Documents the generation process

## Files that should NEVER be edited

- `*.py` (except `__init__.py` and this README) - These are completely regenerated from schemas

---

**Remember**: The JSON schemas in `schema/` and `schemas/` are the single source of truth for all type definitions!