# Memory Bank - Project Navigation & Key Decisions

## Repository Overview

**Main Architecture**: Monorepo with VS Code extension, shared types library, and Fly.io deployment infrastructure.

**Key Directories**:
- `apps/vs-code/` - VS Code extension with Plot JSON editor and WebSocket bridge
- `libs/shared-types/` - JSON Schema → TypeScript/Python types with validators
- `libs/web-components/` - React + Leaflet UI components for maritime visualization
- `libs/tool-vault-packager/` - Python tool packaging system (uses npm!)
- `workspace/` - Sample plot files and test data

---

## Critical Recent Implementations

### LLM Integration Architecture - Issue #205 ✅
**Agent:** Architecture Planning Agent
**Completed:** 2025-10-01

**Summary:**
Comprehensive architectural design for enabling LLM extensions (Claude Code, GitHub Copilot, local LLMs) to orchestrate multi-step maritime analysis workflows through Future Debrief's existing WebSocket and Tool Vault infrastructure.

**Key Architectural Decisions:**
1. **Primary Integration Pattern**: MCP stdio servers (native support in Claude Code, extensible to Copilot and Ollama)
2. **Wrapper vs Refactoring**: Phase 0 framework defers decision until requirements clarified (web dashboard timeline, client dependencies, team bandwidth)
3. **Security Model**: Localhost-only with no additional auth for Phase 1 (sufficient for local development), optional API keys for Phase 2+
4. **Multi-Platform Support**: Designed for Claude Code, GitHub Copilot CLI, and local LLMs (Ollama + ollama-mcp-bridge) simultaneously
5. **Tool Vault Integration**: Dynamic tool discovery via HTTP, ToolVaultCommand result handling for state updates

**Output:** Comprehensive architecture document at `docs/llm-integration-architecture.md`
- 7 major sections with 3 Mermaid diagrams
- Technology comparison matrices and decision criteria
- Detailed implementation plans for both wrapper (Phase 1.A) and HTTP refactoring (Phase 1.B)
- POC specification for delete-selected-feature workflow

**Next Steps:**
1. Phase 0 Execution (Week 1): Stakeholder survey, technical spike, decision meeting
2. Create ADR documenting Phase 0 decision rationale
3. Proceed with chosen implementation path

### ActivityBar Component - Issue #199 ✅
**Date**: 2025-10-03
**Objective**: Production-ready VS Code-style ActivityBar component with collapsible and resizable panels

**Solution**: Built custom ActivityBar component with Container + Children pattern using React hooks for state management and proper VS Code styling via vscode-elements primitives.

**Core Features**:
- **Collapsible Panels**: Optional collapse with chevron icons
- **Resizable Panels**: Drag borders between adjacent panels with minimum height enforcement
- **Greedy Space Redistribution**: Open resizable panels share available space equally
- **VS Code Styling**: Native appearance via vscode-elements CSS variables

**Component API**:
```typescript
<ActivityBar>
  <ActivityPanel title="Explorer" collapsible={true} resizable={false}>
    {content}
  </ActivityPanel>
  <ActivityPanel title="Outline" collapsible={false} resizable={true}>
    {content}
  </ActivityPanel>
</ActivityBar>
```

**Files Created**:
- `libs/web-components/src/ActivityBar/ActivityBar.tsx` (270 lines)
- `libs/web-components/src/ActivityBar/ActivityBar.stories.tsx` (8 comprehensive stories)

**Status**: Production-ready, replaces deprecated `DebriefActivity` component

### Debrief Activity Panel Consolidation - Issue #196 ✅
**Decision**: Consolidate 4 separate webview providers into single DebriefActivity component
- **Performance Impact**: Reduced quadruple initialization overhead (HTML generation, bundle loading, GlobalController subscriptions, CSP setup)
- **Implementation**: Single `DebriefActivityProvider` with unified `DebriefActivity` React component using `VscodeSplitLayout`
- **Performance Gains**:
  - Single webview initialization instead of 4
  - Single web-components.js bundle load (597KB) instead of 4× loads
  - Single GlobalController subscription setup
- **Files**:
  - `libs/web-components/src/DebriefActivity/DebriefActivity.tsx`
  - `apps/vs-code/src/providers/panels/debriefActivityProvider.ts`

**Note**: Being replaced by ActivityBar component (Issue #199)

### Outline View Tool-Vault Decoupling - Issue #185 ✅
**Date**: 2025-10-02
**Objective**: Remove blocking dependency between outline view and tool-vault server loading state

**Problem**: Outline view threw errors and blocked rendering when tool-vault unavailable during extension startup.

**Solution**: Non-blocking tool fetching with graceful fallback
- Changed from throwing errors to returning `null` when tools unavailable
- Outline view now appears immediately when `.plot.json` file opens
- Tool execute button shows "0 tools present" when unavailable
- Tools become available dynamically via `toolVaultReady` event

**Files Modified**: `apps/vs-code/src/providers/panels/debriefOutlineProvider.ts`

### Tool Vault Docker Integration - Issue #175 ✅
**Decision**: Include Tool Vault package in Docker images for complete maritime analysis functionality

**Implementation**:
1. **CI/CD Changes**: Added Tool Vault build step in `apps/vs-code/CI/action/build-extension/action.yml`
   - Builds `toolvault.pyz` package (222KB) with tests
   - Uses npm (Tool Vault excluded from pnpm workspace)
2. **Dockerfile Changes**: Copies pre-built `toolvault.pyz` to `/home/coder/tool-vault/toolvault.pyz`
   - Sets `DEBRIEF_TOOL_VAULT_PATH` environment variable
   - Exposes port 60124 for Tool Vault MCP-compatible REST endpoints

### ToolVault Pydantic Migration - Issue #113 Phase 2 ✅
**Decision**: Migrated from pydoc-derived parameter schemas to Pydantic models with JSON Schema generation

**Solution**: Schema-first approach using Pydantic models with `.model_json_schema()` generation
- **Pilot Tool**: `word_count` tool successfully migrated
- **Key Files**:
  - `libs/tool-vault-packager/tools/word_count/execute.py` - Pydantic models defined inline
  - `discovery.py` - Added `detect_pydantic_parameter_model()` and `extract_pydantic_parameters()`
  - `cli.py` - Added `call_tool_with_pydantic_support()`
- **Benefits**: Rich JSON Schema generation, runtime parameter validation, clean pre-production implementation

---

## Core Architecture Patterns

### WebSocket Bridge Architecture ✅
**Port**: localhost:60123 (fixed)
**Protocol**: JSON commands with optional filename parameters
**Multi-Plot Support**: Automatic filename detection or explicit specification
**Commands**: notify, get_feature_collection, add_feature, delete_feature, etc.
**Key File**: `apps/vs-code/src/debriefWebSocketServer.ts`

### Plot JSON Editor ✅
**Custom webview editor** with Leaflet map and outline integration
- Validation using shared-types validators
- Leaflet map + feature list with bidirectional selection
- `.plot.json` files automatically open in custom editor
- Feature-level diagnostics for validation errors

### Monorepo Structure - Shared Types ✅
**Full monorepo** with pnpm workspaces
- **Type Generation**: JSON Schema → TypeScript interfaces + Python classes + validators
- **Build System**: `pnpm build` generates all types, `pnpm typecheck` validates
- **Import Path**: `@debrief/shared-types/validators/typescript`
- **Exception**: Tool Vault Packager uses npm due to Docker constraints

### VS Code Extension Bundling - Issue #10 ✅
**Migration**: tsc → esbuild for 40x faster builds
- **Build Time**: ~800ms → ~20ms
- **Configuration**: `apps/vs-code/esbuild.js`
- **Commands**: `pnpm compile`, `pnpm watch`, `pnpm vscode:prepublish`

---

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

### Tool Vault Packager (uses npm!)
```bash
cd libs/tool-vault-packager
npm run build       # Create .pyz package
npm run serve       # Start production server
npm run dev:spa     # SPA development mode
npm test            # Integration tests
```

### Individual Package Development
```bash
# Shared Types
pnpm --filter @debrief/shared-types build
pnpm --filter @debrief/shared-types dev    # Watch mode

# Web Components
pnpm --filter @debrief/web-components build
pnpm --filter @debrief/web-components storybook

# VS Code Extension
cd apps/vs-code
pnpm compile        # Bundle with esbuild
pnpm watch          # Development with sourcemaps
```

---

## Key Technical Decisions

### Shared Types Architecture
**Schema-first approach**: JSON schemas in `schemas/features/` and `schemas/states/` directories
- **Multi-language generation**: TypeScript types and Python classes auto-generated
- **Maritime GeoJSON extensions**: Custom feature types for tracks, points, annotations
- **Master source**: Pydantic models in `libs/shared-types/python-src/debrief/types/`

**Workflow for schema changes**:
1. Update Pydantic models in `python-src/debrief/types/`
2. Run `pnpm --filter @debrief/shared-types build` to regenerate schemas and TypeScript types
3. Update dependent packages
4. Verify with `pnpm typecheck`

### Web Components Architecture
**Dual consumption**: React components + vanilla JS bundles
- **Leaflet integration**: Maritime map visualization with custom layers
- **State synchronization**: Bidirectional data binding with editors
- **Key components**: MapComponent, CurrentStateTable, OutlineViewParent, PropertiesView, ActivityBar

### Strict Typing Philosophy
**Fail-fast approach** during pre-production development
- Use TypeScript interfaces from `libs/shared-types/src/types` whenever possible
- Reject malformed data immediately rather than deferring issues downstream
- Example: Track Properties Validation (Issue #179) - fixed test data to match schema rather than add backwards-compatible alias

### Docker & Deployment

**Local Docker Testing**: Test VS Code extension in Docker before deploying to fly.io
- **Documentation**: `apps/vs-code/docs/local-docker-testing.md`
- **Quick Start**: `docker build -t debrief-vscode-local --build-arg GITHUB_SHA=local --build-arg PR_NUMBER=dev -f apps/vs-code/Dockerfile .`

**Fly.io Cost Management**:
- **Cleanup Script**: `./scripts/cleanup-flyio-apps.sh` - check for orphaned PR apps (safe default)
- **Immediate Cleanup**: `./scripts/cleanup-flyio-apps.sh --destroy` - remove all orphaned apps
- **Documentation**: `apps/vs-code/docs/flyio-setup.md#cleanup-management`

### CI/CD Standards
**Node.js Version**: Defined in `.nvmrc` file at repository root
- **GitHub Actions**: Always use `node-version-file: '.nvmrc'` instead of hardcoded versions
- **pnpm version**: Match `packageManager` in root package.json (currently 10.14.0)
- **Build order**: shared-types must build first to create required Python wheel

---

## Historical Context (Compressed)

### Earlier Migrations (Pre-2025-09)

**TypeScript Generator - Issue #16**: Replaced quicktype with `json-schema-to-typescript` for discriminated unions
**Centralized State Management - Issue #33**: GlobalController pattern for state synchronization across webviews
**Automated Vanilla Build - Issue #44**: `vanilla-generated.tsx` auto-generation for non-React consumption
**Python WebSocket API - Issue #87**: Typed state objects in Python WebSocket client
**PropertiesView Integration - Issue #45**: Replaced custom HTML with PropertiesView React component

---

*Last Updated: 2025-10-03*
*Trimmed from 2455 lines to ~400 lines (84% reduction)*
