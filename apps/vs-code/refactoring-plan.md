# VS Code Extension Refactoring Plan

## Phase 1: Create Directory Structure ✅
```bash
mkdir -p src/core
mkdir -p src/providers/panels
mkdir -p src/providers/editors  
mkdir -p src/providers/outlines
mkdir -p src/services
mkdir -p src/legacy
```

## Phase 2: Move Core Architecture Files
```bash
# Core state management system
mv src/globalController.ts src/core/
mv src/editorIdManager.ts src/core/
mv src/editorActivationHandler.ts src/core/
mv src/statePersistence.ts src/core/
```

## Phase 3: Move Provider Files
```bash
# Panel providers
mv src/timeControllerProvider.ts src/providers/panels/
mv src/propertiesViewProvider.ts src/providers/panels/
mv src/debriefOutlineProvider.ts src/providers/panels/

# Editor providers
mv src/plotJsonEditor.ts src/providers/editors/

# Outline providers
mv src/customOutlineTreeProvider.ts src/providers/outlines/
mv src/geoJsonOutlineProvider.ts src/providers/outlines/
```

## Phase 4: Move Service Files
```bash
# External services
mv src/debriefWebSocketServer.ts src/services/
```

## Phase 5: Move Legacy Files
```bash
# Legacy state management
mv src/debriefStateManager.ts src/legacy/
```

## Phase 6: Update Import Paths

### extension.ts imports:
```typescript
// Core
import { GlobalController } from './core/globalController';
import { EditorIdManager } from './core/editorIdManager';
import { EditorActivationHandler } from './core/editorActivationHandler';
import { StatePersistence } from './core/statePersistence';

// Providers
import { PlotJsonEditorProvider } from './providers/editors/plotJsonEditor';
import { CustomOutlineTreeProvider } from './providers/outlines/customOutlineTreeProvider';
import { TimeControllerProvider } from './providers/panels/timeControllerProvider';
import { DebriefOutlineProvider } from './providers/panels/debriefOutlineProvider';
import { PropertiesViewProvider } from './providers/panels/propertiesViewProvider';

// Services
import { DebriefWebSocketServer } from './services/debriefWebSocketServer';

// Legacy (to be removed)
import { DebriefStateManager } from './legacy/debriefStateManager';
```

### Core module cross-imports:
```typescript
// In core/statePersistence.ts
import { GlobalController } from './globalController';
import { EditorIdManager } from './editorIdManager';

// In core/editorActivationHandler.ts
import { GlobalController } from './globalController';
import { EditorIdManager } from './editorIdManager';
```

## Phase 7: Create Index Files for Clean Imports

### src/core/index.ts:
```typescript
export { GlobalController } from './globalController';
export { EditorIdManager } from './editorIdManager';
export { EditorActivationHandler } from './editorActivationHandler';
export { StatePersistence } from './statePersistence';
export type { EditorState, StateEventType, StateSliceType } from './globalController';
```

### src/providers/index.ts:
```typescript
export { PlotJsonEditorProvider } from './editors/plotJsonEditor';
export { TimeControllerProvider } from './panels/timeControllerProvider';
export { DebriefOutlineProvider } from './panels/debriefOutlineProvider';
export { PropertiesViewProvider } from './panels/propertiesViewProvider';
export { CustomOutlineTreeProvider } from './outlines/customOutlineTreeProvider';
```

### src/services/index.ts:
```typescript
export { DebriefWebSocketServer } from './debriefWebSocketServer';
```

## Phase 8: Simplified Extension Imports
```typescript
// Clean imports from organized modules
import {
    GlobalController,
    EditorIdManager, 
    EditorActivationHandler,
    StatePersistence
} from './core';

import {
    PlotJsonEditorProvider,
    TimeControllerProvider,
    DebriefOutlineProvider,
    PropertiesViewProvider,
    CustomOutlineTreeProvider
} from './providers';

import { DebriefWebSocketServer } from './services';
import { DebriefStateManager } from './legacy/debriefStateManager';
```

## Benefits of This Structure:

1. **Clear Separation of Concerns**
   - Core architecture isolated and reusable
   - UI providers grouped by type
   - Services clearly separated
   - Legacy code quarantined for removal

2. **Better Maintainability** 
   - Easier to locate specific functionality
   - Clear dependency relationships
   - Supports incremental legacy removal

3. **Enhanced Developer Experience**
   - Logical file organization
   - Clean import statements
   - Self-documenting structure

4. **Future-Proof Architecture**
   - Easy to add new providers
   - Core system remains stable
   - Supports additional services

## Migration Notes:

- **TypeScript paths**: Update `tsconfig.json` if using path mapping
- **Build system**: Verify esbuild handles new structure correctly  
- **Tests**: Update test imports if they exist
- **Documentation**: Update CLAUDE.md with new structure