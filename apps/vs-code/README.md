# Debrief VS Code Extension

A comprehensive VS Code extension for Debrief maritime analysis, providing custom Plot JSON editing, GeoJSON visualization, and Python integration through WebSocket bridge.

## Features

This extension provides comprehensive maritime analysis capabilities:

- **Plot JSON Editor**: Custom webview editor for `.plot.json` files with interactive Leaflet map
- **GeoJSON Outline View**: Tree view showing features from plot files with bidirectional selection
- **WebSocket Bridge**: Python integration on localhost:60123 for external tool communication
- **Debrief Activity Panel**: Dedicated activity bar with TimeController, Outline, and PropertiesView, and State Monitor
- **Feature Validation**: Comprehensive validation using shared JSON Schema types

## Development Setup

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/debrief/future-debrief-parent.git
   cd future-debrief-parent/a/apps/vs-code
   ```

2. Install dependencies (from monorepo root):
   ```bash
   cd ../../  # Navigate to monorepo root
   pnpm install
   ```

3. Build the extension:
   ```bash
   pnpm --filter vs-code build
   # Or from vs-code directory:
   cd apps/vs-code && pnpm compile
   ```

4. Launch Extension Development Host:
   - Press `F5` in VS Code
   - Or run "Debug: Start Debugging" from Command Palette

### GitHub Codespaces Development

1. **From Repository**: Click "Code" → "Create codespace on main"
2. **From PR**: Use the Codespace link automatically added to PR comments
3. Dependencies install automatically via devcontainer configuration

## Testing the Extension

Once the Extension Development Host launches:

1. **Test Plot JSON Editor**:
   - Open a `.plot.json` file from the workspace/ directory
   - Verify the custom Plot JSON editor opens with interactive map
   - Test feature selection and outline synchronization

2. **Check WebSocket Bridge**:
   - Run Python tests: `cd workspace/tests && python test_integration.py`
   - Verify WebSocket server starts on port 60123
   - Test Python-to-VS Code communication

3. **View Debrief Activity Panel**:
   - Click the Debrief icon in the Activity Bar
   - Verify TimeController, Outline, and PropertiesView panels
   - Test feature selection across panels

## Project Structure

```
vs-code/
├── .vscode/
│   ├── launch.json                # VS Code debug configurations
│   └── tasks.json                 # Build and development tasks
├── media/
│   ├── debrief-icon.svg          # Activity bar icon
│   └── plotJsonEditor.js         # Plot editor webview implementation
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── plotJsonEditor.ts         # Custom Plot JSON editor
│   ├── debriefWebSocketServer.ts # Python WebSocket bridge
│   ├── customOutlineTreeProvider.ts # GeoJSON outline view
│   ├── timeControllerProvider.ts # Time controller webview
│   ├── debriefOutlineProvider.ts # Debrief outline provider
│   ├── propertiesViewProvider.ts # Properties view webview
│   └── debriefStateManager.ts    # State management
├── dist/                         # Compiled JavaScript (generated)
├── package.json                  # Extension manifest
├── tsconfig.json                # TypeScript configuration
└── CLAUDE.md                    # Development guidance
```

## PR Preview Workflow

When you create a Pull Request:

1. **GitHub Actions triggers** automatically on PR creation/updates
2. **Workflow validates** extension compiles successfully  
3. **Comment is added** to PR with Codespace preview link
4. **Team members can test** changes directly in Codespace

### Creating a Test PR

1. Create a feature branch:
   ```bash
   git checkout -b feature/test-changes
   ```

2. Make changes to the extension (e.g., modify messages in `src/extension.ts`)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test extension changes"
   git push origin feature/test-changes
   ```

4. Create PR via GitHub UI or CLI:
   ```bash
   gh pr create --title "Test Extension Changes" --body "Testing PR preview workflow"
   ```

5. Check PR comments for Codespace preview link

## Build Commands

- `pnpm compile` - Fast esbuild compilation with sourcemaps (~20ms)
- `pnpm watch` - Watch mode compilation for development  
- `pnpm dev` - Alias for watch mode
- `pnpm build` - Production build (alias for compile)
- `pnpm vscode:prepublish` - Minified build for publishing
- `pnpm typecheck` - TypeScript validation without compilation
- `pnpm lint` - ESLint + TypeScript checking

**Note**: This extension is part of a pnpm monorepo. Install dependencies from the root directory with `pnpm install`.

## Troubleshooting

### Extension Not Loading
- Ensure esbuild compilation succeeded (`pnpm compile`)
- Check console for activation errors (Developer Tools → Console)
- Verify WebSocket server starts on port 60123
- Ensure dependencies are installed from monorepo root (`pnpm install`)
- Check shared-types and web-components are built (`pnpm build` from root)

### Codespace Issues
- Check `.devcontainer/devcontainer.json` configuration
- Ensure required extensions are listed in devcontainer
- Verify Node.js version compatibility

### GitHub Actions Failing
- Check workflow logs in GitHub Actions tab
- Ensure repository has Actions enabled
- Verify workflow permissions for commenting on PRs

## Development Workflow

This extension is part of a monorepo with shared dependencies:

1. **Root Setup**: Run `pnpm install` from monorepo root
2. **Build Dependencies**: Run `pnpm build` to build shared-types and web-components
3. **Extension Development**: Use `pnpm dev` for watch mode development
4. **Testing**: Run Python integration tests from `workspace/tests/`
5. **Debugging**: Use F5 to launch Extension Development Host

## Architecture

The extension integrates several key components:

- **Custom Editor**: Plot JSON files open in custom webview with Leaflet map
- **WebSocket Server**: Enables Python integration for external tools
- **State Management**: Coordinates between multiple views and panels
- **Type Validation**: Uses shared JSON Schema for feature validation
- **Activity Panel**: Dedicated Debrief workspace with time control and properties

See `CLAUDE.md` for detailed development guidance and `Memory_Bank.md` for architectural decisions.

## WebSocket API

The extension provides a WebSocket server on `localhost:60123` for Python integration. The server supports the following commands:

### Time State Commands

#### `get_time` - Get Current Time State
Retrieves the current time state for a specified document.

**Request:**
```json
{
  "command": "get_time",
  "params": {
    "filename": "sample.plot.json"  // Optional: if not specified, uses active document
  }
}
```

**Response:**
```json
{
  "result": {
    "current": "2025-09-03T12:00:00Z",
    "range": ["2025-09-03T10:00:00Z", "2025-09-03T14:00:00Z"]
  }
}
```

#### `set_time` - Update Time State
Updates the time state for a specified document.

**Request:**
```json
{
  "command": "set_time",
  "params": {
    "timeState": {
      "current": "2025-09-03T13:00:00Z",
      "range": ["2025-09-03T10:00:00Z", "2025-09-03T14:00:00Z"]
    },
    "filename": "sample.plot.json"  // Optional
  }
}
```

**Response:**
```json
{
  "result": "Time state updated successfully"
}
```

### Viewport State Commands

#### `get_viewport` - Get Current Viewport State
Retrieves the current map viewport bounds for a specified document.

**Request:**
```json
{
  "command": "get_viewport",
  "params": {
    "filename": "sample.plot.json"  // Optional
  }
}
```

**Response:**
```json
{
  "result": {
    "bounds": [-10.0, 50.0, 2.0, 58.0]
  }
}
```

#### `set_viewport` - Update Viewport State
Updates the map viewport bounds for a specified document.

**Request:**
```json
{
  "command": "set_viewport",
  "params": {
    "viewportState": {
      "bounds": [-5.0, 45.0, 5.0, 55.0]
    },
    "filename": "sample.plot.json"  // Optional
  }
}
```

**Response:**
```json
{
  "result": "Viewport state updated successfully"
}
```

### Python API Client

The extension includes a Python client API for easy integration:

```python
from debrief_api import debrief

# Get current time state
time_state = debrief.get_time("sample.plot.json")
print(f"Current time: {time_state['current']}")

# Update time to center of range
from datetime import datetime
start = datetime.fromisoformat(time_state['range'][0].replace('Z', '+00:00'))
end = datetime.fromisoformat(time_state['range'][1].replace('Z', '+00:00'))
center = start + (end - start) / 2
time_state['current'] = center.isoformat().replace('+00:00', 'Z')
debrief.set_time(time_state, "sample.plot.json")

# Get and update viewport
viewport = debrief.get_viewport("sample.plot.json")
if viewport:
    print(f"Current bounds: {viewport['bounds']}")
    
# Set new viewport bounds [west, south, east, north]
new_viewport = {"bounds": [-10.0, 50.0, 2.0, 58.0]}
debrief.set_viewport(new_viewport, "sample.plot.json")
```

### Error Handling

All commands follow a consistent error format:

```json
{
  "error": {
    "message": "File not found or not open: sample.plot.json",
    "code": 404
  }
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `404` - File not found or not open
- `500` - Internal server error
- `"MULTIPLE_PLOTS"` - Multiple plots open, filename required

### Existing Feature Commands

The API also supports feature collection management:

- `get_feature_collection` - Get GeoJSON features
- `set_feature_collection` - Update GeoJSON features
- `get_selected_features` - Get currently selected features
- `set_selected_features` - Update feature selection
- `update_features` - Update specific features by ID
- `add_features` - Add new features
- `delete_features` - Delete features by ID
- `zoom_to_selection` - Zoom map to selected features
- `list_open_plots` - List all open plot files

See `workspace/tests/debrief_api.py` for complete API documentation and examples.

