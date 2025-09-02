# Memory Bank - Project Navigation & Key Decisions

## Repository Overview

**Main Architecture**: Monorepo with VS Code extension, shared types library, and Fly.io deployment infrastructure.

**Key Directories**:
- `apps/vs-code/` - VS Code extension with Plot JSON editor and WebSocket bridge
- `libs/shared-types/` - JSON Schema → TypeScript/Python types with validators
- `workspace/` - Sample plot files and test data
- Dockerfile & fly.toml for deployment

---

## Critical Decisions & Implementation Notes

### TypeScript Generator - Issue #16 ✅
**Decision**: Replace quicktype with `json-schema-to-typescript` for discriminated unions
- **Problem**: quicktype creates union properties instead of proper discriminated types
- **Solution**: `json-schema-to-typescript` generates perfect discriminated unions with literal types
- **Location**: `libs/shared-types/package.json` build scripts
- **Key File**: Manual template `templates/featurecollection.ts.txt` can be removed after migration

### VS Code Extension Bundling - Issue #10 ✅
**Decision**: Migrate from tsc to esbuild for 40x faster builds
- **Build Time**: ~800ms → ~20ms 
- **Configuration**: `apps/vs-code/esbuild.js` with sourcemaps for dev, minification for prod
- **Commands**: `pnpm compile`, `pnpm watch`, `pnpm vscode:prepublish`

### Monorepo Structure - Shared Types ✅
**Decision**: Full monorepo with pnpm workspaces
- **Migration**: Moved from individual packages to centralized `libs/shared-types`
- **Type Generation**: JSON Schema → TypeScript interfaces + Python classes + validators
- **Build System**: `pnpm build` generates all types, `pnpm typecheck` validates
- **Import Path**: `@debrief/shared-types/validators/typescript`

### WebSocket Bridge Architecture ✅
**Decision**: WebSocket server inside VS Code extension for Python integration
- **Port**: localhost:60123 (fixed)
- **Protocol**: JSON commands with optional filename parameters
- **Multi-Plot Support**: Automatic filename detection or explicit specification
- **Commands**: notify, get_feature_collection, add_feature, delete_feature, etc.
- **Key File**: `apps/vs-code/src/debriefWebSocketServer.ts`

### Plot JSON Editor ✅
**Decision**: Custom webview editor with Leaflet map and outline integration
- **Validation**: Comprehensive feature validation using shared-types validators
- **UI**: Leaflet map + feature list with bidirectional selection
- **File Association**: `.plot.json` files automatically open in custom editor
- **Error Handling**: Detailed validation errors with feature-level diagnostics
- **Key Files**: 
  - `apps/vs-code/src/plotJsonEditor.ts`
  - `apps/vs-code/src/customOutlineTreeProvider.ts`

### JSON Schema Validation System ✅
**Decision**: Comprehensive validation with discriminated feature types
- **Schema Structure**: FeatureCollection → Features with dataType discriminator
- **Feature Types**: 
  - `dataType: "track"` - LineString/MultiLineString with timestamps
  - `dataType: "reference-point"` - Point with time properties  
  - `dataType: "zone"` - Any geometry for annotations
  - `dataType: "buoyfield"/"backdrop"` - Skip validation (allowed but not validated)
- **Validators**: TypeScript functions in `libs/shared-types/validators/typescript/`
- **Error Reporting**: Feature-level validation with detailed error messages

---

## Infrastructure & Deployment

### Docker Configuration ✅
- **Base**: codercom/code-server:latest with Node.js 18.x
- **Build Process**: Extension packaged as .vsix and installed during build
- **Authentication**: Disabled (`--auth none`) for public access
- **Workspace**: Pre-loads sample files with helpful README

### Fly.io Deployment ✅
- **Configuration**: `fly.toml` with automatic scaling
- **Memory**: 512MB with swap for build processes
- **Auto-Cleanup**: Scheduled cleanup of old deployments
- **CI/CD**: GitHub Actions pipeline for automated deployments

### GitHub Actions Pipeline ✅
- **Triggers**: PR creation/updates with automatic deployment
- **Cleanup**: Old deployments removed after PR closure
- **Secrets**: Fly.io API token for deployment authentication

---

## Development Workflow

### Build Commands
```bash
# Root level (monorepo)
pnpm install          # Install all dependencies
pnpm build           # Build shared-types and VS Code extension  
pnpm typecheck       # TypeScript validation across workspace

# VS Code extension
cd apps/vs-code
pnpm compile         # Fast esbuild compilation
pnpm watch          # Development with file watching
pnpm vscode:prepublish  # Production build (minified)

# Shared types
cd libs/shared-types
pnpm build          # Generate TypeScript + Python types + validators
pnpm test           # Run JSON Schema validation tests
```

### Testing
- **Extension**: F5 in VS Code launches Extension Development Host
- **WebSocket**: Python tests in `workspace/tests/` (requires `pip install -r requirements.txt`)
- **Integration**: `python test_integration.py` for comprehensive API testing
- **Plot Files**: `.plot.json` files in workspace/ for editor testing

### Key Files for Future Development
- `apps/vs-code/src/extension.ts` - Extension entry point
- `apps/vs-code/src/plotJsonEditor.ts` - Custom editor implementation
- `apps/vs-code/src/debriefWebSocketServer.ts` - Python integration bridge
- `libs/shared-types/schema/*.schema.json` - JSON Schema definitions
- `libs/shared-types/validators/typescript/` - Validation logic
- `apps/vs-code/CLAUDE.md` - Development guidance for Claude Code

---

## Troubleshooting Common Issues

### Validation Errors
- **Invalid dataType**: Ensure `dataType` is one of: "track", "reference-point", "zone"
- **Missing Properties**: All features require `properties` object with `dataType`
- **Geometry Mismatch**: Track=LineString, Point=Point, Zone=any geometry

### Build Issues
- **esbuild Errors**: Check `apps/vs-code/esbuild.js` configuration
- **Type Generation**: Run `pnpm build` in `libs/shared-types` first
- **Module Resolution**: Verify pnpm workspaces in root `package.json`

### WebSocket Connection
- **Port 60123**: Fixed port, ensure no conflicts
- **Multiple Plots**: Specify filename or get error with available options
- **Python Integration**: Use `workspace/tests/debrief_api.py` for examples

---

*Last Updated: 2025-01-29*  
*Total Sections Compressed: 15 major implementations*  
*Focus: Key decisions, file locations, and navigation for future developers*