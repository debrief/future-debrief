# Air-Gapped TypeScript Types Distribution

This document describes how to distribute and use Debrief TypeScript types in air-gapped environments where internet connectivity is not available.

## Overview

Two solutions are provided for distributing Debrief TypeScript types to air-gapped environments:

1. **VS Code Extension Bundling** (Primary Solution) - Types are bundled with the VS Code extension and can be exported to workspaces
2. **Standalone .tgz Package** (Secondary Solution) - Types can be distributed as a standalone npm package file

## Solution 1: VS Code Extension Bundling

### How It Works

The Debrief VS Code extension automatically bundles TypeScript types during the build process. These types are available at a predictable path within the extension directory and can be exported to analyst workspaces on demand.

### Building the Extension with Types

When building the VS Code extension, types are automatically bundled:

```bash
# Build extension (automatically includes types)
pnpm --filter vs-code build

# Development mode (includes types)
pnpm --filter vs-code dev
```

The build process:
1. Copies TypeScript types from `libs/shared-types/src/types/`
2. Copies validators from `libs/shared-types/src/validators/`
3. Copies JSON schemas from `libs/shared-types/schema/` and `libs/shared-types/schemas/`
4. Includes the package.json for proper module resolution

### Using the Extension Command

Analysts can export types to their workspace using the built-in command:

1. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. **Run Command**: "Export Debrief Types to Workspace"
3. **Result**: Types are copied to `node_modules/@debrief/shared-types/` in the workspace

### Workspace Setup

After exporting types, analysts can use them in their TypeScript/JavaScript projects:

```typescript
// Import Debrief types in your code
import { DebriefFeatureCollection, DebriefTrackFeature, DebriefPointFeature } from '@debrief/shared-types';
import { TimeState, ViewportState, SelectionState } from '@debrief/shared-types';

// Use the types
const featureCollection: DebriefFeatureCollection = {
  type: "FeatureCollection",
  features: []
};
```

### Generated tsconfig.json

If no `tsconfig.json` exists in the workspace, the command automatically creates one with appropriate settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules"]
}
```

### IntelliSense Support

Once types are exported, VS Code provides full IntelliSense support:
- Type definitions for all Debrief maritime types
- Auto-completion for properties and methods
- Type checking and validation
- Inline documentation

## Solution 2: Standalone .tgz Package

### Creating the Package

Generate a distributable .tgz package:

```bash
# Create .tgz package
pnpm --filter @debrief/shared-types pack:tgz

# Package is created at: libs/shared-types/debrief-shared-types-1.0.0.tgz
```

### Package Contents

The .tgz package includes all necessary files for air-gapped distribution:
- `src/types/` - Generated TypeScript type definitions
- `src/validators/` - Runtime validators for type checking
- `schema/` and `schemas/` - Source JSON schemas
- `dist/` - Compiled JavaScript and TypeScript declaration files
- `package.json` - Package metadata and export configuration

### Installing the Package

In an air-gapped environment:

```bash
# Install the package from the .tgz file
npm install ./debrief-shared-types-1.0.0.tgz

# Or using yarn
yarn add ./debrief-shared-types-1.0.0.tgz
```

### Using the Installed Package

After installation, use the types normally:

```typescript
// Import from the installed package
import { DebriefFeatureCollection } from '@debrief/shared-types';
import { validateFeatureCollectionComprehensive } from '@debrief/shared-types';

// Types and validators are fully available
const isValid = validateFeatureCollectionComprehensive(myData);
```

## Available Types

Both solutions provide access to the complete set of Debrief types:

### Maritime GeoJSON Types
- `DebriefFeatureCollection` - Collection of maritime features
- `DebriefTrackFeature` - Vessel track with temporal data
- `DebriefPointFeature` - Point-in-time vessel position
- `DebriefAnnotationFeature` - Maritime annotations and markers

### State Management Types
- `TimeState` - Time controller state for temporal navigation
- `ViewportState` - Map viewport and zoom settings
- `SelectionState` - Feature selection state
- `EditorState` - Plot editor state management
- `CurrentState` - Real-time vessel state data

### Validators
- `validateFeatureCollectionComprehensive` - Complete feature collection validation
- `validateTrackFeature` - Track-specific validation
- `validatePointFeature` - Point feature validation
- `validateAnnotationFeature` - Annotation validation

## Version Synchronization

Both solutions automatically maintain version synchronization:
- Extension bundling uses the same version as the shared-types package
- .tgz packages are versioned to match the source types
- Analysts receive consistent type definitions across all distribution methods

## Troubleshooting

### VS Code Extension Issues

**"Debrief types are not bundled with this extension"**
- Rebuild the extension with `pnpm --filter vs-code build`
- Ensure shared-types package built successfully first

**"Could not locate Debrief extension installation"**
- Verify the extension is properly installed and enabled
- Check extension ID matches the publisher configuration

### Package Installation Issues

**"Cannot install .tgz package"**
- Verify the file path is correct
- Ensure npm/yarn has write permissions to node_modules
- Check that the workspace has a package.json file

### Type Resolution Issues

**"Cannot find module '@debrief/shared-types'"**
- Verify types were exported/installed correctly
- Check node_modules/@debrief/shared-types exists
- Restart TypeScript language server in VS Code

**"Type definitions not working"**
- Ensure tsconfig.json has correct moduleResolution setting
- Verify "skipLibCheck": true is set
- Check that TypeScript version is compatible (>=4.0)

## Air-Gapped Environment Considerations

### Security
- All types are statically generated from JSON schemas
- No runtime network dependencies
- Validation functions work completely offline
- All code is inspectable and auditable

### Distribution
- Extension .vsix files can be distributed via secure channels
- .tgz packages can be copied to air-gapped environments
- No external dependencies required at runtime
- Complete type definitions included in distribution

### Updates
- New versions require re-distribution of extension or .tgz package
- Version information is clearly marked in package metadata
- Breaking changes are documented in type definitions
- Backward compatibility maintained within major versions