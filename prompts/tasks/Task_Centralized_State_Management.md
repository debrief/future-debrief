# APM Task Assignment: Centralized State Management Implementation

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** As an Implementation Agent, you are responsible for executing assigned tasks diligently and logging work meticulously. You will implement a comprehensive centralized state management strategy that consolidates disparate state handling across the codebase.

**Workflow:** You will interact with the Manager Agent (via the User) and must maintain detailed logs in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to the centralized state management requirements outlined in `docs/debrief-state-srd.md`.

**Objective:** Implement a centralized application state management strategy for the Debrief VS Code extension that provides a single source of truth for editor state, allowing panels and external services to read and update state consistently while removing legacy state management code scattered across sub-projects.

**Detailed Action Steps:**

### Phase 1: Documentation and Analysis
1. **Audit Current State Management:**
   - Document where state is currently held in the `vs-code` extension (text editor APIs, document providers)
   - Document where state is currently held in `web-components` (local React component state)
   - Identify duplicated or legacy state stores across both sub-projects
   - Document overlaps and inconsistencies in current state handling
   - Create a comprehensive audit report for human review before proceeding with removal

### Phase 2: Schema Definition and Type Generation
2. **Define JSON Schemas:**
   - Create JSON Schema for **TimeState** in `libs/shared-types/schemas/TimeState.json`:
     ```json
     {
       "current": "2025-09-03T12:00:00Z"
     }
     ```
   - Create JSON Schema for **ViewportState** in `libs/shared-types/schemas/ViewportState.json`:
     ```json
     {
       "bounds": [-10.0, 50.0, 2.0, 58.0]
     }
     ```
   - Create JSON Schema for **SelectionState** in `libs/shared-types/schemas/SelectionState.json`:
     ```json
     {
       "selectedIds": ["id-123", "id-456"]
     }
     ```

3. **Generate TypeScript Interfaces and Python Bindings:**
   - Set up code generation tooling to produce TypeScript interfaces from schemas
   - Set up code generation tooling to produce Python dataclasses/validators from schemas
   - Create `EditorState` aggregation type that combines all sub-state objects
   - Ensure generated types are available in both `vs-code` and `web-components` packages

### Phase 3: GlobalController Implementation
4. **Create GlobalController in VS Code Extension:**
   - Implement singleton `GlobalController` class per VS Code extension host
   - Maintain internal map: `editorId → EditorState`
   - Track `activeEditorId` property
   - Implement API methods:
     - `getStateSlice(editorId, sliceType)` - retrieve specific state slice
     - `updateState(editorId, sliceType, payload)` - update specific state slice
     - `on(event, handler)` - event subscription system
   - Implement event system for: `fcChanged`, `timeChanged`, `viewportChanged`, `selectionChanged`, `activeEditorChanged`

5. **Implement Activation Handling:**
   - Set up custom editor focus event handling (`editorFocused`, `editorBlurred`)
   - Implement `GlobalController.setActiveEditor(editorId)` with state updates and broadcasting
   - Ensure panels subscribe to `activeEditorChanged` events and fetch relevant state slices
   - Configure panels to remain attached to last active Debrief editor when non-Debrief editors are active

### Phase 4: Persistence Integration
6. **Implement State Persistence:**
   - Create logic to strip metadata features from FeatureCollection into respective sub-state objects on load
   - Create logic to inject metadata features (viewport, time) back into FeatureCollection on save
   - Ensure selection state remains ephemeral and is not persisted
   - Integrate persistence with VS Code's editor lifecycle

### Phase 5: Panel and Service Integration
7. **Refactor Panels to Use GlobalController:**
   - Update panels to attach/detach to editors via GlobalController
   - Implement panel redrawing only when new Debrief editor becomes active
   - Ensure panels continue displaying state when non-Debrief editors are active
   - Eliminate panel flickering when switching between Debrief and non-Debrief editors
   - Update Debrief Activity view panels (time controller, outline, properties) to register for state updates

8. **Integrate External Services:**
   - Configure webservicehost to interact with GlobalController using same API as panels
   - Provide full read/write access to all state types for external services
   - Ensure updates from external services propagate to all subscribed consumers

### Phase 6: Legacy Code Removal
9. **Remove Component-Level State:**
   - Remove local component state for selection management
   - Remove local component state for time slider functionality
   - Remove local component state for viewport bounds
   - Replace removed state with GlobalController subscriptions
   - Ensure no panels maintain local shadow copies of state

### Phase 7: Undo/Redo Integration
10. **Implement History Stack:**
    - Include all state types (FC, selection, time, viewport) in unified history stack
    - Integrate with VS Code's undo/redo system on per-editor basis
    - Ensure state changes can be properly reverted through standard undo operations

**Provide Necessary Context/Assets:**
- Review existing state management patterns in both `vs-code` and `web-components` packages
- Understand current panel architecture and communication patterns
- Reference FeatureCollection (GeoJSON) structure and metadata injection patterns
- Consider webservicehost integration requirements for external API access
- Ensure compatibility with existing VS Code extension lifecycle and document provider patterns

## 3. Expected Output & Deliverables

**Define Success:** Successful completion requires:
- Single source of truth for all editor state across the extension
- Consistent state updates propagating to all consumers (panels, external services)
- Elimination of state duplication and drift between components
- Proper editor lifecycle integration with state persistence
- Seamless switching between editors without panel flickering or state loss

**Specify Deliverables:**
1. JSON Schema definitions in `libs/shared-types/schemas/` for TimeState, ViewportState, and SelectionState
2. Generated TypeScript interfaces and Python bindings from schemas
3. `EditorState` aggregation type definition
4. `GlobalController` implementation in `vs-code` extension with full API
5. Updated panel implementations using GlobalController subscriptions
6. Refactored web-components to use centralized state management
7. Integration with webservicehost for external service access
8. Undo/redo integration with VS Code's history system
9. Removal of all legacy state management code
10. Comprehensive documentation of the new state management architecture

**Format:** All code should follow existing project conventions, use TypeScript for type safety, and include comprehensive error handling and logging.

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the assigned task based on the centralized state management SRD
- A clear description of all actions taken during implementation
- Code snippets for key components (GlobalController API, state schemas, integration patterns)
- Any key decisions made regarding state management architecture
- Any challenges encountered during legacy code removal and how they were resolved
- Confirmation of successful execution including validation results
- Documentation of the new state management workflow and API usage patterns

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- The exact structure and API design for the GlobalController
- Integration patterns between VS Code extension host and webview panels
- State persistence and serialization requirements
- Event propagation and subscription management
- Legacy code identification and safe removal procedures