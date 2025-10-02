# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm install` - Install dependencies (run from root for full workspace)
- `pnpm compile` - Bundle extension with esbuild + copy schemas and dependencies
- `pnpm watch` - Watch mode bundling with esbuild for development
- `pnpm vscode:prepublish` - Prepare for publishing (minified esbuild bundle + schemas)
- `pnpm copy-schemas` - Copy JSON schemas from libs/shared-types to extension
- `pnpm typecheck` - Type check TypeScript without compilation
- `pnpm lint` - Run ESLint for code quality and TypeScript patterns
- `pnpm eslint` - Run ESLint only (no TypeScript check)

### Build System

The extension uses **esbuild** for fast bundling and includes JSON schema integration:
- Source files in `src/` are bundled into a single `dist/extension.js` file
- Bundle includes all dependencies except VS Code API (externalized)
- Development builds include sourcemaps for debugging
- Production builds are minified for optimal performance
- **Schema copying**: JSON schemas from `libs/shared-types` are copied to `schemas/` directory
- **Language configuration**: Plot JSON files inherit JSON language server features
- Build time: ~20ms for TypeScript + schema copying

## TypeScript Patterns and Code Quality

This VS Code extension follows strict TypeScript patterns enforced by ESLint. **All code must pass linting before being committed.**

### Required TypeScript Patterns

#### 1. **No Explicit `any` Types** (Error Level)
```typescript
// ❌ FORBIDDEN - Will cause build to fail
const result = data as any;
const toolIndex = await getToolIndex() as any;

// ✅ REQUIRED - Use proper types
const result = data as { success: boolean; error?: string };
const toolIndex = await getToolIndex() as { tools: unknown[] };

// ✅ PREFERRED - Use Record<string, unknown> for objects
const commandObj = obj as Record<string, unknown>;
```

#### 2. **Console Logging Restrictions** (Warning Level)
```typescript
// ❌ FORBIDDEN - Will show warnings
console.log('Debug message');
console.debug('Debug info');
console.info('Information');

// ✅ ALLOWED - Only these console methods
console.error('Error occurred');
console.warn('Warning message');
console.warn('[Service] Debug info'); // Use warn with prefix for debug
```

#### 3. **Variable Declaration Patterns**
```typescript
// ❌ FORBIDDEN
let result = getData(); // Never reassigned
var oldStyle = 'bad';

// ✅ REQUIRED
const result = getData(); // Use const when not reassigned
let counter = 0; // Use let only when reassigning
```

#### 4. **Unused Variables** (Error Level)
```typescript
// ❌ FORBIDDEN - Will cause build to fail
function processData(data, unusedParam) {
  return data.process();
}

// ✅ REQUIRED - Prefix unused parameters with underscore
function processData(data: unknown, _unusedParam: string) {
  return data.process();
}
```

### Type Safety Patterns

#### Working with Unknown Types
```typescript
// ✅ PATTERN: Type guards for runtime checking
function isToolVaultCommand(obj: unknown): obj is ToolVaultCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'command' in obj &&
    'payload' in obj &&
    typeof (obj as Record<string, unknown>).command === 'string'
  );
}

// ✅ PATTERN: Safe type assertions with proper interfaces
interface ToolIndex {
  tools: Array<{ name: string; [key: string]: unknown }>;
}
const toolIndex = await getToolIndex() as ToolIndex;
```

#### API Response Handling
```typescript
// ✅ PATTERN: Define response interfaces
interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// ✅ PATTERN: Handle unknown API responses safely
function extractToolVaultCommands(result: unknown): SpecificCommand[] {
  if (!result || typeof result !== 'object') {
    return [];
  }

  // Safe array checking
  if (Array.isArray(result)) {
    return result.filter(isToolVaultCommand);
  }

  // Safe property access
  if ('commands' in result && Array.isArray((result as Record<string, unknown>).commands)) {
    return ((result as Record<string, unknown>).commands as unknown[])
      .filter(isToolVaultCommand);
  }

  return [];
}
```

### ESLint Configuration

The project uses `eslint.config.js` with these key rules:

```javascript
{
  '@typescript-eslint/no-explicit-any': 'error',           // No any types
  '@typescript-eslint/no-unused-vars': ['error', {        // No unused vars
    argsIgnorePattern: '^_'                                // Allow _param
  }],
  'no-console': ['warn', { allow: ['error', 'warn'] }],   // Limited console
  'prefer-const': 'error',                                 // Use const when possible
  'no-var': 'error',                                       // No var declarations
}
```

### Code Quality Checks

Run these commands before committing:

```bash
# Type checking (must pass)
pnpm typecheck

# Linting (must pass - no errors allowed)
pnpm lint

# Full compilation (must pass)
pnpm compile
```

**Important**: The build pipeline will fail if any linting errors are present. Warnings are acceptable but should be minimized.

### Integration with ToolVaultCommandHandler

When integrating with the ToolVaultCommandHandler service from `@debrief/web-components`:

```typescript
// ✅ CORRECT: Import proper types
import {
  ToolVaultCommandHandler,
  StateSetter,
  SpecificCommand
} from '@debrief/web-components/services';

// ✅ CORRECT: Implement StateSetter with proper typing
const stateSetter: StateSetter = {
  setViewportState: (state: ViewportState) => {
    if (this.activeEditorId) {
      this.updateState(this.activeEditorId, 'viewportState', state);
    }
  },
  // ... other methods
};

// ✅ CORRECT: Process commands with proper error handling
async processToolVaultCommands(result: unknown): Promise<void> {
  try {
    const commands = this.extractToolVaultCommands(result);
    if (commands.length === 0) {
      console.warn('[Controller] No ToolVaultCommands found');
      return;
    }

    const results = await this.toolVaultCommandHandler.processCommands(
      commands,
      currentFeatureCollection
    );

    // Process results...
  } catch (error) {
    console.error('[Controller] Error processing commands:', error);
    // Don't re-throw - log and continue
  }
}
```

## Testing

### Extension Testing
- Press `F5` in VS Code to launch Extension Development Host
- Or run "Debug: Start Debugging" from Command Palette
- **Test JSON Schema Validation**: Open `.plot.json` files and verify autocomplete/validation works

### WebSocket Bridge Testing
Navigate to `workspace/tests/` and run:
- `pip install -r requirements.txt` - Install Python test dependencies
- `python test_integration.py` - Run comprehensive integration tests
- `python test_notify_command.py` - Test VS Code notifications from Python
- `python test_optional_filename.py` - Test optional filename functionality
- `python test_plot_api.py` - Test full plot manipulation API with optional filename support

### Playwright End-to-End Testing
Automated Docker-based tests validate the complete deployment workflow:

```bash
# Prerequisites (one-time or when dependencies change)
pnpm --filter @debrief/shared-types build
pnpm --filter @debrief/web-components build

# Run all tests
pnpm test:playwright
```

**Test Performance:**
- **First run:** ~3-5 minutes (builds Docker image once)
- **Subsequent runs:** ~20ms VSIX build + instant container start (**99%+ faster!**)

**Optimization Details:**
- Uses `Dockerfile.playwright` (testing-specific, isolated from production)
- Docker image is built once and cached indefinitely
- VSIX is volume-mounted at runtime for instant extension updates
- No Docker rebuild needed for extension code changes

**When to rebuild Docker image:**
```bash
docker rmi debrief-playwright-test  # Only when shared dependencies change
pnpm test:playwright                # Next run rebuilds automatically
```

**Rebuild triggers:**
1. Shared-types dependencies change (Python packages, JSON schemas)
2. Web-components dependencies change (npm packages)
3. Tool Vault package changes (libs/tool-vault-packager)
4. Dockerfile.playwright changes
5. System dependencies change (Python/Node versions)

**Never rebuild for:**
- ❌ Extension source code changes (`src/**`) - handled by VSIX volume mount
- ❌ Extension config changes (`package.json`, `tsconfig.json`) - included in VSIX rebuild
- ❌ Workspace file changes - already in image

See `docs/local-docker-testing.md` for complete testing guide.

## Architecture

### Core Components

**VS Code Extension (`src/extension.ts`)**
- Main extension entry point with activate/deactivate lifecycle
- Registers custom Plot JSON editor and GeoJSON outline view
- Starts WebSocket server on port 60123 for Python integration

**WebSocket Bridge (`src/debriefWebSocketServer.ts`)**
- WebSocket server runs inside VS Code extension on localhost:60123
- Handles JSON command protocol for Python-to-VS Code communication
- Supports plot manipulation commands with **optional filename parameters**
- Automatically starts on extension activation and stops on deactivation

**Plot JSON Editor (`src/plotJsonEditor.ts`)**
- Custom webview editor for `.plot.json` files
- Displays GeoJSON data on Leaflet map with feature selection
- Integrates with outline view for feature navigation
- **JSON Schema Support**: Files also get validation and autocomplete in text editor mode

**Custom Outline (`src/customOutlineTreeProvider.ts`)**
- Tree view showing GeoJSON features from active plot files
- Syncs with Plot JSON editor for feature highlighting and selection

### Key Design Patterns

- **WebSocket Integration**: Python scripts can interact with VS Code through WebSocket bridge
- **Webview Communication**: Plot editor uses VS Code webview API with message passing
- **Document Syncing**: Outline view automatically updates when plot files change
- **Extension Lifecycle**: WebSocket server managed through extension activation/deactivation

### File Structure

```
schemas/                           # JSON schemas (generated during build)
├── features/                     # Feature schemas from libs/shared-types
│   ├── FeatureCollection.schema.json
│   ├── Track.schema.json
│   ├── Point.schema.json
│   └── Annotation.schema.json
└── states/                       # State schemas from libs/shared-types
    ├── TimeState.schema.json
    ├── ViewportState.schema.json
    └── ...
src/
├── core/                          # Core architecture
│   ├── globalController.ts        # Centralized state management
│   ├── editorIdManager.ts         # Document-to-ID mapping
│   ├── editorActivationHandler.ts # Focus/activation handling
│   ├── statePersistence.ts        # FeatureCollection persistence
│   └── index.ts                   # Core module exports
├── providers/                     # VS Code UI providers
│   ├── editors/
│   │   └── plotJsonEditor.ts      # Custom .plot.json editor
│   ├── panels/
│   │   ├── timeControllerProvider.ts
│   │   ├── propertiesViewProvider.ts
│   │   └── debriefOutlineProvider.ts
│   └── outlines/
│       ├── customOutlineTreeProvider.ts
│       └── geoJsonOutlineProvider.ts
├── services/                      # External integrations
│   └── debriefWebSocketServer.ts  # WebSocket bridge for Python
├── legacy/                        # Legacy code (to be removed)
│   └── debriefStateManager.ts     # Old state system
└── extension.ts                   # Main extension entry point
language-configuration.json       # Plot JSON language configuration
package.json                       # Extension manifest with schema validation
```

### WebSocket Protocol

Messages are JSON-based with this structure:
```json
{
  "command": "notify",
  "params": {
    "message": "Hello from Python!"
  }
}
```

**Optional Filename Support**: Most plot commands now support optional filename parameters:
```json
{
  "command": "get_feature_collection",
  "params": {}
}
```

When filename is omitted:
- **Single plot open**: Command executes automatically
- **Multiple plots open**: Returns `MULTIPLE_PLOTS` error with available options
- **No plots open**: Returns clear error message

Responses:
```json
{
  "result": null
}
```

Error format:
```json
{
  "error": {
    "message": "Error description",
    "code": 400
  }
}
```

Multiple plots error format:
```json
{
  "error": {
    "message": "Multiple plots open, please specify filename",
    "code": "MULTIPLE_PLOTS",
    "available_plots": [
      {"filename": "mission1.plot.json", "title": "Mission 1"},
      {"filename": "mission2.plot.json", "title": "Mission 2"}
    ]
  }
}
```

## Key Integration Points

- **Python Testing**: Use `workspace/tests/debrief_api.py` for WebSocket integration
- **Plot Files**: `.plot.json` files in workspace/ for testing custom editor
- **JSON Schema Validation**: Files automatically validated using FeatureCollection.schema.json
- **Port Configuration**: WebSocket bridge uses fixed port 60123
- **Feature Selection**: Outline view and plot editor are bidirectionally linked

## JSON Schema Integration

The extension provides comprehensive JSON schema validation for `.plot.json` files:

### Schema Sources
- Schemas are copied from `libs/shared-types/schemas/` during build process
- Primary schema: `FeatureCollection.schema.json` for overall structure validation
- Child schemas: `Track.schema.json`, `Point.schema.json`, `Annotation.schema.json` via `$ref` resolution

### Language Configuration
- `.plot.json` files are recognized as "Plot JSON" language but inherit JSON features
- `language-configuration.json` provides JSON-like syntax rules and auto-pairing
- Grammar contribution uses `source.json` scope for syntax highlighting
- `application/json` mimetype enables JSON language server features

### VS Code Features Enabled
- **Real-time validation**: Red squiggles for invalid JSON structure or schema violations
- **IntelliSense**: Property autocomplete based on schema definitions
- **Documentation**: Hover tooltips showing property descriptions from schemas
- **Formatting**: Pretty-printing and auto-indentation for JSON content
- **Error details**: Detailed error messages for schema validation failures

### Build Integration
- `copy-schemas` script copies all schemas during compilation
- Schemas are included in extension package (not in .gitignore)
- Schema paths in `jsonValidation` contribution: `./schemas/features/FeatureCollection.schema.json`

## Tool Vault Integration

Tool Vault provides MCP-compatible REST endpoints on port 60124. It's packaged as a `.pyz` file but requires runtime dependencies.

### Critical Architecture Constraint

**Python `.pyz` files cannot bundle compiled extensions.** Packages like `pydantic` v2 have Rust components (`pydantic_core._pydantic_core.so`) that must be installed in the system Python environment, not bundled in the archive.

**Solution:**
- `.pyz` contains: tool code, FastAPI server, React SPA
- Runtime installs: `debrief-types` wheel, `fastapi`, `uvicorn` (Dockerfile lines 101-104)
- Build validates: `debrief` module importable (fail-fast in `packager.py:294-307`)

**Key Dockerfile requirement:**
```dockerfile
# tool-vault-builder stage needs 'python' command for npm build
RUN ln -s /usr/bin/python3 /usr/bin/python
```

See `docs/local-docker-testing.md` for testing instructions.