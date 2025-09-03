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
- Existing schemas: `annotation.schema.json`, `featurecollection.schema.json`, `point.schema.json`, `track.schema.json`
- Location: `libs/shared-types/schema/`
- Code generation ready: TypeScript interfaces already generated

## Recommendations for Migration

1. **Extend DebriefStateManager**: Make it the true GlobalController
2. **Create New State Schemas**: Add TimeState, ViewportState, SelectionState schemas
3. **Refactor PlotJsonEditor**: Remove static state, integrate with GlobalController
4. **Update Web Components**: Replace local state with GlobalController subscriptions
5. **Enhance WebSocket Integration**: Connect directly to GlobalController
6. **Implement Per-Editor State**: Replace filename-based static state with proper editor lifecycle management

This audit provides the foundation for implementing the centralized state management system as specified in the SRD.