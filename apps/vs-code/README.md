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

