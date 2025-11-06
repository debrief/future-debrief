# Debrief VS Code Extension

A comprehensive VS Code extension for Debrief maritime analysis, providing custom Plot JSON editing, GeoJSON visualization, and Python integration through MCP HTTP server.

## Features

This extension provides comprehensive maritime analysis capabilities:

- **Plot JSON Editor**: Custom webview editor for `.plot.json` files with interactive Leaflet map
- **GeoJSON Outline View**: Tree view showing features from plot files with bidirectional selection
- **MCP Server**: Python integration and AI assistant access on localhost:60123 via JSON-RPC 2.0
- **Debrief Activity Panel**: Dedicated activity bar with TimeController, Outline, and PropertiesView, and State Monitor
- **JSON Schema Validation**: Real-time validation of `.plot.json` files using schemas from `libs/shared-types`
- **Feature Validation**: Comprehensive validation using shared JSON Schema types with IntelliSense support

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

### Docker Local Testing

Test the extension in a complete Docker environment before deploying to fly.io:

1. **Quick Start**: See [Local Docker Testing Guide](docs/local-docker-testing.md) for complete instructions
2. **Prerequisites**: Docker Desktop, Node.js (from `.nvmrc`), pnpm 10.14.0
3. **Build and Run**:
   ```bash
   # Build prerequisites
   pnpm install
   pnpm --filter @debrief/shared-types build
   pnpm --filter @debrief/web-components build

   # Package extension and copy to repository root
   cd apps/vs-code && npx @vscode/vsce package --no-dependencies && cp vs-code-0.0.1.vsix ../../ && cd ../..

   # Build Docker image
   docker build -t debrief-vscode-local --build-arg GITHUB_SHA=local --build-arg PR_NUMBER=dev -f apps/vs-code/Dockerfile .

   # Run container
   docker run -p 8080:8080 debrief-vscode-local
   ```
4. **Access**: Open `http://localhost:8080` in your browser

For detailed instructions, troubleshooting, and testing procedures, see [docs/local-docker-testing.md](docs/local-docker-testing.md).

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
   - Verify JSON schema validation provides autocomplete and error highlighting

2. **Check MCP Server**:
   - Run Python tests: `cd workspace/tests && python test_http_connection.py`
   - Verify MCP server starts on port 60123
   - Test Python-to-VS Code communication via MCP

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
├── schemas/                      # JSON schema files (generated during build)
│   ├── features/                 # Feature schemas from shared-types
│   └── states/                   # State schemas from shared-types
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── services/
│   │   └── debriefMcpServer.ts   # MCP HTTP server for Python/AI integration
│   ├── providers/
│   │   ├── editors/
│   │   │   └── plotJsonEditor.ts # Custom Plot JSON editor
│   │   ├── panels/               # Activity panel providers
│   │   └── outlines/             # Outline view providers
│   ├── core/                     # Core architecture (state, lifecycle)
│   └── components/               # UI components (status bar indicators)
├── dist/                         # Compiled JavaScript (generated)
├── language-configuration.json  # Plot JSON language configuration
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

- `pnpm compile` - Fast esbuild compilation with sourcemaps (~20ms) + copies schemas
- `pnpm watch` - Watch mode compilation for development
- `pnpm dev` - Alias for watch mode
- `pnpm build` - Production build (alias for compile)
- `pnpm vscode:prepublish` - Minified build for publishing + schema bundling
- `pnpm copy-schemas` - Copy JSON schemas from libs/shared-types
- `pnpm typecheck` - TypeScript validation without compilation
- `pnpm lint` - ESLint + TypeScript checking

**Note**: This extension is part of a pnpm monorepo. Install dependencies from the root directory with `pnpm install`.

## Automated Testing

### Playwright End-to-End Tests

Automated tests validate the Docker deployment with real browser interactions:

```bash
# Prerequisites (one-time or when dependencies change)
pnpm --filter @debrief/shared-types build
pnpm --filter @debrief/web-components build

# Run all tests
pnpm test:playwright

# Interactive test development
pnpm test:playwright:ui

# Debug mode
pnpm test:playwright:debug
```

**Performance:**
- **First run:** ~3-5 minutes (builds Docker image once)
- **Subsequent runs:** ~20ms VSIX build only (**99%+ faster!**)

**How it works:**
- Docker image is cached and reused across test runs
- Only your extension code (VSIX) rebuilds between runs
- Container uses volume mount for instant VSIX updates

**When to rebuild Docker image:**
```bash
# Only needed when shared dependencies change:
docker rmi debrief-playwright-test  # Force rebuild
pnpm test:playwright                # Next run rebuilds automatically
```

Rebuild triggers: shared-types changes, web-components changes, Tool Vault changes, Dockerfile changes. Extension code changes **never** require a Docker rebuild.

For complete testing documentation, see [docs/local-docker-testing.md](docs/local-docker-testing.md#playwright-testing).

## Troubleshooting

### Extension Not Loading
- Ensure esbuild compilation succeeded (`pnpm compile`)
- Check console for activation errors (Developer Tools → Console)
- Verify MCP server starts on port 60123
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
- **MCP Server**: Enables Python integration and AI assistant access via HTTP
- **State Management**: Coordinates between multiple views and panels
- **Type Validation**: Uses shared JSON Schema for feature validation
- **Activity Panel**: Dedicated Debrief workspace with time control and properties

See `CLAUDE.md` for detailed development guidance and `Memory_Bank.md` for architectural decisions.

## MCP API

The extension provides an **MCP (Model Context Protocol) HTTP server** on `http://localhost:60123/mcp` for programmatic access from Python scripts, AI assistants, and external tools.

### MCP Server Details

- **URL**: `http://localhost:60123/mcp`
- **Protocol**: JSON-RPC 2.0 over HTTP
- **Transport**: HTTP Stream (stateless)
- **Port**: 60123
- **Auto-start**: Server starts automatically when the extension activates

### Available MCP Tools

The MCP server exposes the following tools for plot manipulation:

#### Feature Management
- `debrief_add_features` - Add new features to a plot
- `debrief_update_features` - Update existing features by ID
- `debrief_delete_features` - Delete features by ID
- `debrief_set_features` - Replace entire feature collection

#### State Management
- `debrief_set_selection` - Set selected feature IDs
- `debrief_zoom_to_selection` - Zoom map viewport to fit selected features
- `debrief_set_time` - Update time state (start, current, end)
- `debrief_set_viewport` - Update map viewport bounds

#### Notifications
- `debrief_notify` - Display a notification to the user

### Available MCP Resources

The MCP server provides these resources for reading plot state:

- `plot://{filename}/features` - Get feature collection for a specific plot
- `plot://{filename}/selection` - Get selected feature IDs
- `plot://{filename}/time` - Get time state
- `plot://{filename}/viewport` - Get viewport state
- `plot://features` - Auto-select plot if only one is open
- `plot://selection` - Auto-select plot if only one is open
- `plot://time` - Auto-select plot if only one is open
- `plot://viewport` - Auto-select plot if only one is open
- `plots://list` - List all currently open plot files

### Python MCP Client

The extension includes a Python MCP client (`workspace/tests/mcp_client.py`) with **typed state objects** for type safety and IDE support:

```python
from mcp_client import MCPClient

# Create MCP client (no initialization needed in stateless mode)
client = MCPClient()

# Test connection
if client.test_connection():
    print("✓ Connected to MCP server")

# Get features from a plot
features = client.get_features("sample.plot.json")
print(f"Plot has {len(features.features)} features")

# Add new features
from debrief.types.features.point import DebriefPointFeature
new_point = DebriefPointFeature(
    type="Feature",
    geometry={"type": "Point", "coordinates": [-74.0059, 40.7589]},
    properties={"name": "New York", "id": "nyc_1"}
)
client.add_features([new_point], filename="sample.plot.json")

# Update selection
client.set_selection(["nyc_1"], filename="sample.plot.json")
client.zoom_to_selection("sample.plot.json")

# Get and update time state
time_state = client.get_time("sample.plot.json")
if time_state:
    print(f"Current time: {time_state.current}")
    # Update time to a new value
    from debrief.types.states.time_state import TimeState
    new_time = TimeState(
        current="2025-09-03T13:00:00Z",
        start=time_state.start,
        end=time_state.end
    )
    client.set_time(new_time, "sample.plot.json")

# Display notification
client.notify("Processing complete!", level="info")
```

#### Type Safety Benefits

The MCP client provides:
- **IDE Auto-completion**: Full IntelliSense support for all methods and state objects
- **Runtime Validation**: Automatic Pydantic validation of requests and responses
- **Better Documentation**: Clear method signatures with type hints
- **Error Handling**: Proper exception handling with MCPError

### Optional Filename Support

Most MCP tools support optional filename parameters:

```python
# When only one plot is open, filename is optional
client.get_features()  # Auto-selects the open plot
client.set_selection(["feature1"])  # Works without filename

# When multiple plots are open, filename is required
client.get_features("mission1.plot.json")  # Must specify which plot
```

### Error Handling

All MCP requests follow JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "File not found or not open: sample.plot.json"
  }
}
```

The Python client raises `MCPError` exceptions:

```python
from mcp_client import MCPClient, MCPError

try:
    client = MCPClient()
    features = client.get_features("nonexistent.plot.json")
except MCPError as e:
    print(f"MCP Error {e.code}: {e.message}")
```

Common error scenarios:
- File not found or not open
- Multiple plots open without filename specified
- Invalid feature data
- Network/connection errors

### Using the MCP Inspector

The official MCP Inspector provides a web-based UI for testing and debugging:

```bash
# Connect to the running MCP server
npx @modelcontextprotocol/inspector http://localhost:60123/mcp
```

**Prerequisites:**
1. The VS Code extension must be running (F5 or Extension Development Host)
2. The MCP server starts automatically when the extension activates

**What you can do with the Inspector:**
- Browse all available MCP tools and resources
- Test tool invocations with custom parameters
- View real-time request/response messages
- Debug MCP protocol communication
- Inspect server capabilities and metadata

**Note**: The MCP Inspector is a separate debugging tool, not part of the extension itself. It connects to the already-running MCP server exposed by the extension.

See `workspace/tests/mcp_client.py` for complete API documentation and examples.

