# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation for development
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

## Testing

### Extension Testing
- Press `F5` in VS Code to launch Extension Development Host
- Or run "Debug: Start Debugging" from Command Palette

### WebSocket Bridge Testing
Navigate to `workspace/tests/` and run:
- `pip install -r requirements.txt` - Install Python test dependencies
- `python test_integration.py` - Run comprehensive integration tests
- `python test_notify_command.py` - Test VS Code notifications from Python

## Architecture

### Core Components

**VS Code Extension (`src/extension.ts`)**
- Main extension entry point with activate/deactivate lifecycle
- Registers custom Plot JSON editor and GeoJSON outline view
- Starts WebSocket server on port 60123 for Python integration

**WebSocket Bridge (`src/debriefWebSocketServer.ts`)**
- WebSocket server runs inside VS Code extension on localhost:60123
- Handles JSON command protocol for Python-to-VS Code communication
- Currently supports `notify` command, designed for future plot manipulation commands
- Automatically starts on extension activation and stops on deactivation

**Plot JSON Editor (`src/plotJsonEditor.ts`)**
- Custom webview editor for `.plot.json` files
- Displays GeoJSON data on Leaflet map with feature selection
- Integrates with outline view for feature navigation

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
src/
├── extension.ts                    # Main extension entry point
├── debriefWebSocketServer.ts      # WebSocket bridge for Python integration
├── plotJsonEditor.ts              # Custom editor for .plot.json files
├── customOutlineTreeProvider.ts   # Tree view for GeoJSON features
└── geoJsonOutlineProvider.ts      # Base outline provider
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

Responses:
```json
{
  "result": null
}
```

Or error format:
```json
{
  "error": {
    "message": "Error description",
    "code": 400
  }
}
```

## Key Integration Points

- **Python Testing**: Use `workspace/tests/debrief_api.py` for WebSocket integration
- **Plot Files**: `.plot.json` files in workspace/ for testing custom editor
- **Port Configuration**: WebSocket bridge uses fixed port 60123
- **Feature Selection**: Outline view and plot editor are bidirectionally linked