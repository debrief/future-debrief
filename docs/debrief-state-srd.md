# Software Requirements Document (SRD)  
**Project:** Debrief VS Code Extension  
**Topic:** Centralised State Management Strategy  
**Date:** 2025-09-03  

---

## 1. Purpose  

This document specifies requirements for the implementation of a **centralised application state management strategy** for the Debrief VS Code extension. It consolidates current disparate state handling across the `vs-code` and `web-components` sub-projects into a single, coherent model.  

The aim is to:  
- Provide a single source of truth for editor state.  
- Allow panels and external services to read and update state consistently.  
- Remove legacy state management code scattered across sub-projects.  
- Establish a clear migration plan.  

---

## 2. Background  

Currently, state is inconsistently handled:  
- The `vs-code` extension layer stores editor lifecycle and file management state.  
- The `web-components` package contains ad hoc local state for UI components (e.g., selection, time slider).  
- Panels often track state independently rather than subscribing to a central authority.  

This leads to duplication, drift, and difficulties in synchronising updates between panels and editors.  

---

## 3. Scope  

The new state management system will cover four types of state per Debrief editor instance:  

1. **FeatureCollection (FC)** — the GeoJSON data, including injected metadata features for viewport and time.  
2. **Current Selection** — the set of selected feature IDs.  
3. **Current Time** — initially a single instant; expandable later to include ranges and step sizes.  
4. **Current Viewport** — stored as map bounds.  

All VS Code panels, webview panels, and external services (via `webservicehost`) must interact with these states only through the central controller.  

---

## 4. Requirements  

### 4.1 GlobalController  
- Singleton per VS Code extension host.  
- Maintains a map: `editorId → EditorState`.  
- Tracks `activeEditorId`.  
- Exposes an API for panels and services:  
  - `getStateSlice(editorId, sliceType)`  
  - `updateState(editorId, sliceType, payload)`  
  - `on(event, handler)` (events: `fcChanged`, `timeChanged`, `viewportChanged`, `selectionChanged`, `activeEditorChanged`)  

### 4.2 EditorState  
- Defined in `libs/shared-types` for use in both `vs-code` and `web-components`.  
- The `EditorState` is an aggregation of discrete sub-state objects. Each sub-state has its own schema, defined in JSON Schema to allow generation of TypeScript and Python bindings.  
- Sub-states:  
  - **FeatureCollection** (GeoJSON)  
  - **TimeState**  
    ```json
    {
      "current": "2025-09-03T12:00:00Z"
    }
    ```  
  - **ViewportState**  
    ```json
    {
      "bounds": [-10.0, 50.0, 2.0, 58.0]
    }
    ```  
  - **SelectionState**  
    ```json
    {
      "selectedIds": ["id-123", "id-456"]
    }
    ```  
- These schemas will be placed in `libs/shared-types/schemas` and used to generate:  
  - TypeScript interfaces for the frontend.  
  - Python dataclasses/validators for backend and tooling.  

### 4.3 Activation Handling  
- Custom editors (webviews) notify the extension host on focus events (`editorFocused`, `editorBlurred`).  
- `GlobalController.setActiveEditor(editorId)` updates internal state and broadcasts `activeEditorChanged`.  
- Panels subscribe to this event and fetch relevant state slices.  
- Panels remain attached to the last active Debrief editor even if a non-Debrief editor is now active.  

### 4.4 Persistence  
- On load: strip metadata features from FC into their respective sub-state objects.  
- On save: inject metadata features (viewport, time) back into FC.  
- Selection is ephemeral and not persisted.  
- Persistence remains tied to VS Code’s editor lifecycle.  

### 4.5 Panels  
- Panels attach/detach to editors via the GlobalController.  
- Panels only redraw when a new Debrief editor becomes active.  
- Panels continue to display state when non-Debrief editors are active.  
- Panels do not flicker when switching between Debrief and non-Debrief editors.  

### 4.6 External Services  
- Webservicehost interacts with GlobalController the same way panels do.  
- Full read/write access to all state types.  
- Updates propagate to all subscribed consumers.  

### 4.7 Undo/Redo  
- All state (FC, selection, time, viewport) included in one history stack.  
- Managed per editor by VS Code’s undo/redo system.  

---

## 5. Migration Plan  

### 5.1 Documentation Phase  
- Audit where state is currently held in:  
  - `vs-code` extension (text editor APIs, document providers).  
  - `web-components` (local React component state).  
- Identify duplicated or legacy state stores.  
- Document overlaps and inconsistencies.
- Pause for human review, to verify what can and can't be removed.

### 5.2 Removal Phase  
- Remove component-level state for:  
  - Selection.  
  - Time slider.  
  - Viewport bounds.  
- Replace with subscriptions to GlobalController.  
- Ensure panels do not keep local shadow copies.  

### 5.3 Implementation Phase  
1. Define JSON Schemas for **TimeState**, **ViewportState**, **SelectionState** in `libs/shared-types/schemas`.  
2. Generate TS interfaces and Python bindings from schemas.  
3. Introduce `EditorState` aggregation type.  
4. Create `GlobalController` in `vs-code` extension.  
5. Refactor panels to subscribe to GlobalController events instead of managing their own state.  
6. Refactor web-components to request and update state slices via the GlobalController API.  
7. Remove redundant state-related code from both sub-projects.  
8. Update panels in Debrief Activity view to register for state updates, and get/send state updates accordingly (time controller, outline, properties)

### 5.4 Validation Phase  
- Confirm that:  
  - Switching between Debrief editors updates panels correctly.  
  - Switching between Debrief and non-Debrief editors does not clear panels.  
  - Panels reflect updates made by external services (e.g., webservicehost).  
  - State is correctly persisted and restored via FC file operations.  

---

## 6. Non-Requirements  

- RAP command objects are out of scope for this phase.  
- Background history query API is not required.  
- Selection persistence is explicitly excluded.  

---

## 7. Risks  

- Residual legacy state may remain in components, causing duplication.  
- Potential event storms if state changes are too fine-grained.  
- Need to carefully manage editor lifecycle to avoid orphaned states.  
- Cross-language schema generation (TS + Python) adds build complexity.  

---

## 8. Next Steps  

- Define JSON Schemas for discrete state types in `libs/shared-types`.  
- Implement code generation to produce TS and Python bindings.  
- Implement `GlobalController` skeleton in `vs-code`.  
- Document current state handling to guide refactoring.  
- Begin phased migration of panels to use GlobalController.  

---
