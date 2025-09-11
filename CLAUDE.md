# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Future Debrief is a maritime analysis platform built as a **pnpm monorepo** with TypeScript/React components and VS Code extension integration. The architecture follows a strict separation between deliverable apps and reusable libraries, with shared types and web components providing the foundation for maritime data visualization and analysis.

## Package Management

**CRITICAL**: This is a **pnpm monorepo** using workspaces for most packages, but **libs/tool-vault-packager uses npm** due to Docker constraints and maintains its own `package-lock.json`. The same applies to `libs/tool-vault-packager/spa/package-lock.json`.

### Installation Commands
```bash
# Root installation (installs all workspace dependencies)
pnpm install

# Tool Vault Packager (uses npm, not pnpm)
cd libs/tool-vault-packager && npm install
cd libs/tool-vault-packager/spa && npm install
```

## Development Commands

### Monorepo Build System (Turborepo)
```bash
# Build everything
pnpm build

# Build specific packages
pnpm build:shared-types     # Build type definitions first
pnpm build:web-components   # Build React components
pnpm build:vs-code          # Build VS Code extension

# Development
pnpm dev                    # Run VS Code extension in dev mode
pnpm dev:vs-code            # Build dependencies then run VS Code extension
pnpm dev:web-components     # Build web components in dev mode

# Quality checks
pnpm typecheck              # Type check all packages
pnpm lint                   # Lint all packages  
pnpm test                   # Run all tests
pnpm clean                  # Clean all build artifacts
```

### Individual Package Development
```bash
# Shared Types (libs/shared-types)
pnpm --filter @debrief/shared-types build
pnpm --filter @debrief/shared-types test
pnpm --filter @debrief/shared-types dev    # Watch mode for type generation

# Web Components (libs/web-components)
pnpm --filter @debrief/web-components build
pnpm --filter @debrief/web-components test
pnpm --filter @debrief/web-components storybook    # Component development

# VS Code Extension (apps/vs-code)
cd apps/vs-code
pnpm compile        # Bundle with esbuild
pnpm watch          # Development with sourcemaps
pnpm test           # Run extension tests

# Tool Vault Packager (libs/tool-vault-packager - uses npm!)
cd libs/tool-vault-packager
npm run build       # Create .pyz package
npm run serve       # Start production server
npm run dev:spa     # SPA development mode
npm test            # Integration tests
```

## Architecture

### Monorepo Structure
```
apps/                    # Deployable applications (independent release units)
├── vs-code/            # VS Code extension for maritime analysis
├── data-wrangler/      # Data processing utilities
└── stac-server/        # STAC geospatial data server

libs/                    # Shared libraries (internal dependencies only)
├── shared-types/       # TypeScript contracts and JSON schemas
├── web-components/     # React + Leaflet UI components
└── tool-vault-packager/# Python tool packaging system (uses npm!)
```

### Key Dependencies and Data Flow
- **shared-types** → all other packages (provides TypeScript contracts)
- **web-components** → VS Code extension (provides React components)
- **web-components** depends on **shared-types** for GeoJSON contracts
- Apps may depend on libs, but never on other apps
- Tool Vault Packager is independent (Python + React SPA)

### Core Technologies

**Frontend Stack**
- **React 19.1+** with TypeScript for UI components
- **Leaflet + React-Leaflet** for maritime mapping
- **Storybook** for component development and testing
- **esbuild** for fast bundling (VS Code extension)

**Type System**
- **JSON Schema** → **TypeScript types** (shared-types)
- **JSON Schema** → **Python types** via quicktype (shared-types)
- Runtime validation with **Pydantic** (Tool Vault)
- Maritime-specific GeoJSON extensions for tracks, points, annotations

**Build and Package Management**
- **pnpm workspaces** for monorepo dependency management
- **Turborepo** for build orchestration and caching
- **npm** for Tool Vault Packager (Docker constraint)

### Shared Types Architecture

The `libs/shared-types` package provides the foundation for all data contracts:

- **Schema-first approach**: JSON schemas in `schemas/features/` and `schemas/states/` directories
- **Multi-language generation**: TypeScript types and Python classes auto-generated
- **Maritime GeoJSON extensions**: Custom feature types for tracks, points, annotations
- **State management contracts**: Editor state, time state, viewport state

Key generated files:
- `derived/typescript/*.ts` - TypeScript type definitions
- `derived/python/*.py` - Python dataclasses via quicktype

### Web Components Architecture

The `libs/web-components` package provides reusable maritime UI components:

- **Dual consumption**: React components + vanilla JS bundles
- **Leaflet integration**: Maritime map visualization with custom layers
- **Feature rendering**: Tracks, points, zones with maritime-specific styling
- **State synchronization**: Bidirectional data binding with editors

Key components:
- **MapComponent**: Core Leaflet-based maritime mapping
- **CurrentStateTable**: Tabular data display for vessel states
- **Track/Point/Zone renderers**: Maritime-specific feature visualization

### VS Code Extension Integration

The VS Code extension provides a complete maritime analysis environment:

- **Custom editors**: `.plot.json` files with interactive Leaflet maps
- **WebSocket bridge**: Python-to-VS Code integration on port 60123
- **Multi-view architecture**: Time controller, properties, outline tree views
- **Plot manipulation API**: Programmatic control of maritime plots from Python

## Testing Strategy

### Test Matrix by Package Type

**Libraries (libs/)**
- **shared-types**: JSON schema validation, type generation verification
- **web-components**: Jest + React Testing Library, Storybook interaction tests
- **tool-vault-packager**: Playwright tests against both dev server and .pyz packages

**Applications (apps/)**  
- **vs-code**: Extension host testing, WebSocket integration tests, Playwright end-to-end

### Running Tests
```bash
# All tests
pnpm test

# Package-specific tests
pnpm --filter @debrief/shared-types test
pnpm --filter @debrief/web-components test
cd apps/vs-code && pnpm test

# Tool Vault integration tests (uses npm!)
cd libs/tool-vault-packager && npm run test:playwright
```

## Development Workflow

### Adding New Features
1. **Start with shared-types** if new data contracts are needed
2. **Update web-components** for UI changes
3. **Modify apps** to consume the new functionality
4. **Test integration** across the full stack

### Making Changes to Shared Types
1. Update JSON schemas in `libs/shared-types/schemas/features/` or `schemas/states/`
2. Run `pnpm --filter @debrief/shared-types build` to regenerate types
3. Update dependent packages that use the modified types
4. Verify TypeScript compilation across all packages with `pnpm typecheck`

### Dependency Management
- Use `pnpm add` at the root for workspace dependencies
- Use `pnpm add --filter <package>` for package-specific dependencies  
- **Exception**: Tool Vault Packager uses `npm install` due to Docker constraints
- Never add dependencies between apps (apps → apps forbidden)

## Key Integration Points

### VS Code Extension ↔ Python Integration
- **WebSocket server** on port 60123 inside VS Code extension
- **JSON command protocol** for plot manipulation from Python scripts
- **Test files** in `apps/vs-code/workspace/tests/` demonstrate integration patterns
- **Optional filename support** for multi-plot scenarios

### Shared Types ↔ All Packages
- Maritime GeoJSON extensions: `DebriefTrackFeature`, `DebriefPointFeature`, `DebriefAnnotationFeature`
- State contracts: `TimeState`, `ViewportState`, `SelectionState`, `EditorState`
- Validation schemas for runtime type checking

### Web Components ↔ Applications
- React components for maritime visualization
- Vanilla JS bundles for non-React applications
- Leaflet-based mapping with maritime-specific layers and interactions