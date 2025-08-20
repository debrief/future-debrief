# Debrief VS Code Extension

A Visual Studio Code extension for the Debrief Analysis Tool, providing integrated analysis capabilities directly within your IDE.

## Features

- **Outline View**: Navigate document structure and analysis points
- **Timeline View**: Track recent events and analysis history
- **Integrated Sidebar**: Dedicated Debrief panel in the VS Code activity bar

## Development

### Prerequisites

- Node.js and npm/yarn
- VS Code

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Running the Extension

To run the extension in development mode with hot-reloading:

1. **Start the watch process**:
   ```bash
   yarn watch
   ```
   This starts webpack in watch mode and will automatically recompile when you make changes.

2. **Launch the Extension Development Host**:
   - Press `F5` in VS Code, or
   - Go to Run and Debug panel and click "Run Extension"
   
   This opens a new VS Code window with your extension loaded.

3. **View the extension**:
   - Look for the Debrief icon in the activity bar (left sidebar)
   - Click it to see the Outline and Timeline views

### Hot Reloading During Development

The extension is configured for efficient development workflow:

1. **Make code changes** in the `src/` directory
2. **Watch for compilation** - the `yarn watch` process will automatically recompile
3. **Reload the extension** - Press `Cmd+R` (macOS) or `Ctrl+R` (Windows/Linux) in the Extension Development Host window to reload with your changes

The extension will automatically refresh its views when reloaded.

### Project Structure

```
src/
├── extension.ts           # Main extension entry point
├── DebriefSidebar.ts     # Sidebar panel implementation
├── OutlineViewProvider.ts # Outline tree view provider
└── TimelineViewProvider.ts # Timeline tree view provider
```

### Build Commands

- `yarn compile` - One-time compilation
- `yarn watch` - Watch mode for development
- `yarn package` - Production build
- `yarn lint` - Run ESLint
- `yarn test` - Run tests

## Extension Settings

This extension contributes the following commands:

- `debriefOutline.refresh` - Refresh the outline view
- `debriefTimeline.refresh` - Refresh the timeline view

## Release Notes

### 0.0.1

Initial development version with basic sidebar views.
