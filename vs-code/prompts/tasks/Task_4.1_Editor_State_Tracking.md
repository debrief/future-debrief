# APM Task Assignment: Editor State Tracking

## 1. Onboarding / Context from Prior Work

The postMessage pipeline has been established in Phase 3. The current state includes:
* Extension-to-WebView communication implemented via `postMessage` in both `OutlineViewProvider` and `TimelineViewProvider`
* React applications equipped with robust message handling and state updates
* Typed `SidebarMessage` interface shared across extension and WebView modules
* Bidirectional communication foundation established with error handling

This task builds upon that foundation to implement active monitoring of VS Code editor state and push relevant updates to the sidebar panels.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to `Phase 4: Editor State Tracking` in the [Implementation Plan](../../vs-code/docs/implement-skeleton.md).
* **Objective:** Detect editor changes, extract metadata from Debrief files, and push relevant changes into sidebars to keep them synchronized with the active editor.

* **Detailed Action Steps:**
  1. Implement active editor monitoring:
     * Listen to `vscode.window.onDidChangeActiveTextEditor` events
     * Set up event handlers to respond to editor focus changes
     * Ensure tracking works correctly when switching between multiple editor tabs
  2. Add Debrief editor detection in Debrief sidebars:
     * Verify that the active editor is the Debrief editor (using Editor Context / View Type Detection)
     * Handle cases where non-Debrief files are active (should not trigger sidebar updates)
     * Debrief Sidebar components should be disabled if non-Debrief editor is active
  3. Implement metadata extraction in SideBars:
     * Modify editor to allow it to return current document as a GeoJSON FC
     * Extract feature list from Debrief files
     * TimeLine panel should show time extent of features in current FC
     * Outline should show a tree of Features, grouped by Geometry-Type
     * Handle parsing errors gracefully and provide fallback states
  5. Plan for future extensibility:
     * Consider exposing editor-specific API methods for more granular state access
     * Design the architecture to support additional file types or metadata in the future
     * Ensure the system can handle multiple open plots while syncing sidebars to the active one only

* **Provide Necessary Context/Assets:**
  * The system should focus on Debrief-specific file formats and metadata
  * Editor state changes should trigger immediate sidebar updates for responsive user experience
  * Consider performance implications of frequent state tracking and messaging
  * The architecture should be designed to handle edge cases like rapid tab switching or file closing
  * Multiple plots may be open simultaneously, but sidebars should always reflect the currently active editor

## 3. Expected Output & Deliverables

* **Define Success:** The extension actively monitors VS Code editor changes, correctly identifies Debrief files, extracts relevant metadata, and pushes updates to both sidebar views in real-time.
* **Specify Deliverables:**
  * Event listeners for `onDidChangeActiveTextEditor` implemented
  * Debrief file type detection and validation logic
  * Metadata extraction functionality for Debrief file formats
  * Integration with existing postMessage pipeline
  * Real-time sidebar updates responding to editor state changes
  * Error handling for file parsing and edge cases

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:
* A reference to Phase 4 of the Implementation Plan
* A clear description of the editor state tracking implementation
* Code snippets for event listeners and metadata extraction functions
* Any architectural decisions made regarding file type detection and state management
* Confirmation of successful real-time sidebar synchronization with active editor

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.