# Current State Management Audit Report

## Overview
This report documents the current state management patterns across the Debrief VS Code extension codebase, identifying disparate state handling that needs to be consolidated into a centralized system.

## Current State Management Locations

### 1. VS Code Extension (`apps/vs-code/`)

#### DebriefStateManager (`src/debriefStateManager.ts`)
- **Purpose**: Central state manager for the VS Code extension
- **Current State Structure**:
  ```typescript
  interface DebriefState {
    time?: number;
    viewport?: { center: [number, number]; zoom: number };
    selection?: { featureIndex: number; feature: GeoJSONFeature };
    featureCollection?: GeoJSONFeatureCollection;
  }
  ```
- **Responsibilities**:
  - Tracks active editor changes
  - Manages document changes
  - Provides subscription-based notifications
  - Handles feature selection
- **Integration**: Connected to panels via subscription pattern

#### PlotJsonEditor (`src/plotJsonEditor.ts`)
- **State Management**:
  - Static selection state per filename: `currentSelectionState: { [filename: string]: string[] }`
  - Static map view state per filename: `mapViewState: { [filename: string]: { center: [number, number], zoom: number } }`
  - Static visibility tracking: `wasHidden: { [filename: string]: boolean }`
- **Issues**: File-level static state creates potential conflicts and doesn't integrate with central state management

#### Panel Providers
- **TimeControllerProvider**: Manages internal time slider state in HTML/JavaScript
- **PropertiesViewProvider**: Reactive to state updates but no internal state management
- **DebriefOutlineProvider**: Tracks current document and selection state locally

### 2. Web Components (`libs/web-components/`)

#### MapComponent (`src/MapComponent/MapComponent.tsx`)
- **Local State**:
  - `useState` for current GeoJSON data: `currentData`
  - `useRef` for selected features tracking: `selectedFeaturesRef`
  - `useRef` for feature layers: `featureLayersRef`
  - `useRef` for highlight layers: `highlightLayerRef`
  - `useRef` for map instance: `mapRef`
- **State Management Pattern**: Pure React hooks with prop-based updates
- **Integration**: Communicates via callbacks (`onSelectionChange`, `onMapStateChange`)

#### TimeController (`src/TimeController/TimeController.tsx`)
- **Current Implementation**: Basic placeholder component
- **State**: Receives props but no local state management
- **Note**: Needs full implementation

### 3. External Services

#### DebriefWebSocketServer (`src/debriefWebSocketServer.ts`)
- **Integration**: Interacts with PlotJsonEditor static state
- **Communication**: JSON-based command protocol
- **Current Limitations**: No direct integration with DebriefStateManager

## Problems Identified

### State Duplication
1. **Selection State**: Managed in both DebriefStateManager and PlotJsonEditor
2. **Viewport State**: Tracked in both DebriefStateManager and PlotJsonEditor
3. **Time State**: Scattered across TimeController components and DebriefStateManager

### Inconsistent State Updates
1. PlotJsonEditor bypasses DebriefStateManager for selection/viewport updates
2. Map component maintains local shadow state that can drift
3. Panel providers have mixed integration with central state

### Integration Gaps
1. WebSocket server doesn't use DebriefStateManager
2. Web components use callback-based communication instead of central state
3. No unified event system for state changes

### Editor Lifecycle Issues
1. Static state per filename in PlotJsonEditor doesn't handle editor disposal
2. No proper cleanup when editors are closed
3. State persistence tied to individual components rather than global system

## Current State Types (Need Centralization)

1. **FeatureCollection**: Currently managed by DebriefStateManager
2. **Selection State**: Duplicate management in multiple locations
3. **Time State**: Primitive number type in DebriefStateManager
4. **Viewport State**: Object with center/zoom in multiple locations

## Existing Infrastructure to Leverage

### Positive Elements
1. **DebriefStateManager**: Good foundation with subscription pattern
2. **Shared Types Library**: Existing validation and type system at `libs/shared-types/`
3. **Event-driven Architecture**: VS Code event system integration
4. **WebSocket Protocol**: Established communication pattern for external services

### Schema Infrastructure
- Existing schemas: `Annotation.schema.json`, `FeatureCollection.schema.json`, `Point.schema.json`, `Track.schema.json`
- Location: `libs/shared-types/schemas/features/`
- Code generation ready: TypeScript interfaces already generated

## Implementation Phases

### Phase 8: PlotJsonEditor GlobalController Integration

**Status:** Pending  
**Prerequisite:** Phases 1-7 must be completed (GlobalController, StatePersistence, panel integration)

#### Overview
The PlotJsonEditor currently maintains its own static state management system that operates independently of the centralized GlobalController. This phase migrates all PlotJsonEditor state to use GlobalController, completing the centralized state management implementation.

#### Current PlotJsonEditor State Issues

**Static State Management:**
```typescript
// Current problematic static state in PlotJsonEditor:
private static currentSelectionState: { [filename: string]: string[] } = {};
private static mapViewState: { [filename: string]: { center: [number, number], zoom: number } } = {};
private static wasHidden: { [filename: string]: boolean } } = {};
```

**Problems with Current Approach:**
1. **Isolation**: State changes don't trigger GlobalController events
2. **No History Tracking**: HistoryManager can't track PlotJsonEditor state changes
3. **Duplicate State**: Selection and viewport state duplicated with GlobalController
4. **Memory Leaks**: Static state never cleaned up when editors close
5. **Filename-based Keys**: Fragile mapping that doesn't handle file moves/renames

#### Implementation Steps

##### Step 1: Remove Static State Management

**Files to Modify:**
- `apps/vs-code/src/providers/editors/plotJsonEditor.ts`

**Actions:**
1. Remove all static state properties:
   - `currentSelectionState`
   - `mapViewState` 
   - `wasHidden`

2. Remove static methods that manage this state:
   - `getSelectedFeatures()`
   - `setSelectedFeatures()`
   - `saveMapViewState()`
   - `getMapViewState()`

##### Step 2: Integrate with GlobalController

**Replace Static State Access:**

```typescript
// OLD: Static state access
const selection = PlotJsonEditorProvider.getSelectedFeatures(filename);
PlotJsonEditorProvider.setSelectedFeatures(filename, newSelection);

// NEW: GlobalController access
const editorId = EditorIdManager.getEditorId(document);
const selectionState = globalController.getStateSlice(editorId, 'selectionState');
globalController.updateState(editorId, 'selectionState', { selectedIds: newSelection });
```

**Replace Map State Management:**

```typescript
// OLD: Static map state
PlotJsonEditorProvider.saveMapViewState(filename, center, zoom);
const mapState = PlotJsonEditorProvider.getMapViewState(filename);

// NEW: GlobalController viewport state
const viewportState = { bounds: [west, south, east, north] };
globalController.updateState(editorId, 'viewportState', viewportState);
```

##### Step 3: Update Event Handling

**Selection Changes:**
```typescript
// In webview message handling
case 'selectionChanged': {
    const editorId = EditorIdManager.getEditorId(document);
    const selectionState = { selectedIds: e.selectedFeatureIds };
    globalController.updateState(editorId, 'selectionState', selectionState);
    break;
}
```

**Map State Changes:**
```typescript
case 'mapStateSaved': {
    const editorId = EditorIdManager.getEditorId(document);
    // Convert center/zoom to bounds format
    const viewportState = this.convertCenterZoomToBounds(e.center, e.zoom);
    globalController.updateState(editorId, 'viewportState', viewportState);
    break;
}
```

##### Step 4: Subscribe to GlobalController Events

**Add State Synchronization:**
```typescript
// In resolveCustomTextEditor method
const editorId = EditorIdManager.getEditorId(document);

// Subscribe to state changes for this editor
const stateSubscription = globalController.on('selectionChanged', (data) => {
    if (data.editorId === editorId && webviewPanel.visible) {
        webviewPanel.webview.postMessage({
            type: 'setSelectionByIds',
            featureIds: data.state.selectionState?.selectedIds || []
        });
    }
});

const viewportSubscription = globalController.on('viewportChanged', (data) => {
    if (data.editorId === editorId && webviewPanel.visible) {
        // Convert bounds to center/zoom format for map component
        const mapState = this.convertBoundsToMapState(data.state.viewportState?.bounds);
        if (mapState) {
            webviewPanel.webview.postMessage({
                type: 'restoreMapState',
                center: mapState.center,
                zoom: mapState.zoom
            });
        }
    }
});

// Dispose subscriptions when webview is disposed
webviewPanel.onDidDispose(() => {
    stateSubscription.dispose();
    viewportSubscription.dispose();
});
```

##### Step 5: Handle Tab Switching and Visibility

**Replace wasHidden Logic:**
```typescript
// OLD: Static wasHidden tracking
PlotJsonEditorProvider.wasHidden[filename] = true;

// NEW: Use activation events from EditorActivationHandler
webviewPanel.onDidChangeViewState(() => {
    const editorId = EditorIdManager.getEditorId(document);
    
    if (webviewPanel.visible) {
        // Editor became visible - sync current state
        globalController.setActiveEditor(editorId);
        this.syncWebviewWithGlobalState(webviewPanel, editorId);
    }
});
```

##### Step 6: Add Helper Methods

**State Conversion Utilities:**
```typescript
private convertCenterZoomToBounds(center: [number, number], zoom: number): ViewportState {
    // Convert center/zoom to approximate bounds
    // This is a simplified conversion - may need refinement
    const latRange = 180 / Math.pow(2, zoom);
    const lngRange = 360 / Math.pow(2, zoom);
    
    return {
        bounds: [
            center[1] - lngRange/2,  // west
            center[0] - latRange/2,  // south  
            center[1] + lngRange/2,  // east
            center[0] + latRange/2   // north
        ]
    };
}

private convertBoundsToMapState(bounds?: [number, number, number, number]): { center: [number, number], zoom: number } | null {
    if (!bounds) return null;
    
    const [west, south, east, north] = bounds;
    const center: [number, number] = [(south + north) / 2, (west + east) / 2];
    
    // Approximate zoom from bounds size
    const latRange = north - south;
    const zoom = Math.floor(Math.log2(180 / latRange));
    
    return { center, zoom: Math.max(1, Math.min(18, zoom)) };
}

private syncWebviewWithGlobalState(webviewPanel: vscode.WebviewPanel, editorId: string): void {
    const globalController = GlobalController.getInstance();
    const state = globalController.getEditorState(editorId);
    
    // Sync selection
    if (state.selectionState?.selectedIds) {
        webviewPanel.webview.postMessage({
            type: 'setSelectionByIds',
            featureIds: state.selectionState.selectedIds
        });
    }
    
    // Sync viewport
    if (state.viewportState?.bounds) {
        const mapState = this.convertBoundsToMapState(state.viewportState.bounds);
        if (mapState) {
            webviewPanel.webview.postMessage({
                type: 'restoreMapState',
                center: mapState.center,
                zoom: mapState.zoom
            });
        }
    }
}
```

#### Verification Steps

##### 1. State Persistence Verification
```bash
# Test state persistence across editor sessions
1. Open a .plot.json file in custom editor
2. Select some features  
3. Pan/zoom the map
4. Close the editor tab
5. Reopen the same file
6. Verify: Selection and viewport are restored correctly
```

##### 2. Multi-Editor State Isolation
```bash
# Test state isolation between multiple editors
1. Open two different .plot.json files
2. Make different selections in each editor
3. Switch between editor tabs
4. Verify: Each editor maintains its own selection state
```

##### 3. Panel Synchronization
```bash
# Test panel integration with PlotJsonEditor changes
1. Open Debrief panels (Outline, Properties, Time Controller)
2. Select features in PlotJsonEditor
3. Verify: Outline panel updates to show selection
4. Verify: Properties panel shows selected feature details
```

##### 4. History Integration
```bash
# Test undo/redo functionality
1. Open a .plot.json file
2. Select different features (creates history entries)
3. Run "Debrief: Undo" command
4. Verify: Selection reverts to previous state
5. Run "Debrief: Redo" command  
6. Verify: Selection moves forward in history
```

##### 5. WebSocket Integration
```bash
# Test WebSocket API compatibility
1. Run Python test: workspace/tests/test_plot_api.py
2. Verify: WebSocket commands work with PlotJsonEditor
3. Test: get_feature_collection, set_selection commands
4. Verify: Changes in Python script reflect in PlotJsonEditor
```

##### 6. Memory Leak Prevention
```bash
# Test cleanup when editors close
1. Open multiple .plot.json files
2. Close editors one by one
3. Check: globalController.getEditorIds() removes closed editors
4. Verify: No memory accumulation in static variables
```

#### Expected Benefits

1. **Unified State Management**: All components use GlobalController
2. **History Tracking**: PlotJsonEditor actions included in undo/redo
3. **Better Performance**: No duplicate state management
4. **Proper Cleanup**: Editor state removed when editors close
5. **Panel Synchronization**: Real-time updates across all UI components
6. **WebSocket Compatibility**: External scripts can interact with PlotJsonEditor state

#### Risk Mitigation

**Backwards Compatibility:**
- Keep static methods as deprecated wrappers initially
- Gradual migration approach with feature flags
- Extensive testing before removing legacy code

**State Format Conversion:**
- Handle center/zoom ↔ bounds conversion carefully
- Test edge cases (zoom limits, coordinate edge cases)
- Provide fallback for conversion failures

**Editor Lifecycle:**
- Ensure proper subscription cleanup
- Handle rapid open/close scenarios
- Test with multiple editors open simultaneously

This phase completes the centralized state management implementation by bringing the last major component (PlotJsonEditor) into the unified state system.