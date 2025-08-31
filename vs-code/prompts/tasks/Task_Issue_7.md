# APM Task Assignment: Fix Plot JSON Editor Map State Persistence

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the VS Code Codespace Extension project.

**Your Role:** As an Implementation Agent, you will execute this assigned task diligently and log your work meticulously. You are responsible for implementing the solution with precision and ensuring all acceptance criteria are met.

**Workflow:** You will work independently on this task and report back to the Manager Agent (via the User) upon completion. All work must be documented in the Memory Bank as specified in the logging instructions.

## 2. Task Assignment

**Reference Implementation Plan:** This task addresses GitHub Issue #7: "Plot JSON Editor: Map resets to London and loses features when tab loses/regains focus"

**Objective:** Fix the VS Code webview state persistence issue where the Plot JSON Editor map resets to London (default location) and loses all GeoJSON features when a tab loses focus and then regains it. The solution must ensure map position, zoom level, and feature selections are maintained across tab switches.

**Problem Analysis:**
- **Current Behavior:** When switching away from a .plot.json tab (making it completely hidden) and then returning, the map resets to London coordinates with no features visible
- **Expected Behavior:** Map should maintain its position, zoom level, and display all GeoJSON features with preserved selections
- **Scope:** Issue only occurs when tab is completely obscured, not in split-view scenarios
- **Impact:** High - causes major workflow disruption requiring constant workarounds

**Detailed Action Steps:**

1. **Investigate VS Code Webview Lifecycle:**
   - Research VS Code webview state management and the `onDidChangeViewState` event handling in `src/plotJsonEditor.ts:60-67`
   - Identify why the webview loses state when becoming invisible and visible again
   - Analyze the webview HTML loading process in the `getHtmlForWebview` method at `src/plotJsonEditor.ts:124-177`

2. **Examine Map Initialization Logic:**
   - Review the `initMap()` function in `media/plotJsonEditor.js:11-18` which sets the default London coordinates `[51.505, -0.09]`
   - Analyze the `updateMap()` function at `media/plotJsonEditor.js:21-120` to understand when and why map state is lost
   - Identify the root cause of why `map.fitBounds(geoJsonLayer.getBounds())` at line 95 is not being called on tab visibility change

3. **Implement State Persistence Solution:**
   - **Map View State:** Implement mechanisms to save and restore map center position and zoom level
     - Store current map view (center, zoom) before tab becomes hidden
     - Restore map view when tab becomes visible again
   - **Feature Data State:** Ensure GeoJSON features are properly reloaded and displayed
     - Verify `currentData` persistence in the webview
     - Ensure `updateMap()` is called with correct data when tab regains focus
   - **Selection State:** Maintain feature selections across tab switches
     - Leverage existing selection state management in `PlotJsonEditorProvider.currentSelectionState`
     - Ensure selection restoration works with the existing `setSelectionByIds()` mechanism

4. **Enhanced Event Handling:**
   - Modify the `onDidChangeViewState` event handler in `src/plotJsonEditor.ts:60-67` to:
     - Detect when webview becomes visible after being hidden
     - Trigger proper map state restoration
     - Send appropriate messages to the webview for state recovery
   - Add webview message handlers to save/restore map state in `media/plotJsonEditor.js`

5. **Testing and Validation:**
   - Test the fix with the provided reproduction steps:
     1. Open a .plot.json file with GeoJSON features
     2. Verify map displays correctly with features visible
     3. Switch to another tab (making plot tab completely hidden)
     4. Switch back to the .plot.json tab
     5. Confirm map maintains position, zoom, and features are visible
   - Test edge cases:
     - Multiple .plot.json files open simultaneously
     - Feature selections preserved across tab switches
     - Split-view scenarios continue to work correctly
   - Verify no regression in existing functionality

**Technical Constraints:**
- Solution must work within VS Code webview security model
- Maintain compatibility with existing WebSocket bridge functionality
- Preserve existing feature selection and outline synchronization
- Follow established code patterns in the codebase

## 3. Expected Output & Deliverables

**Define Success:** 
- Map maintains position and zoom level when switching tabs
- GeoJSON features remain visible after tab switches
- Feature selections are preserved across tab switches
- Solution works reliably across different types of tab switches (per acceptance criteria in GitHub issue)

**Specify Deliverables:**
1. Modified `src/plotJsonEditor.ts` with enhanced webview lifecycle management
2. Updated `media/plotJsonEditor.js` with state persistence mechanisms
3. Successful testing confirming all acceptance criteria are met
4. No regression in existing Plot JSON Editor functionality

**Validation Requirements:**
- 100% reproduction rate resolution (issue currently reproduces 100% consistently)
- Compatibility across all supported operating systems
- No errors in VS Code Developer Console

## 4. Memory Bank Logging Instructions (Mandatory)

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #7 and this task assignment
- A clear description of the root cause analysis performed
- Details of the state persistence solution implemented
- Code snippets for key modifications made to both TypeScript and JavaScript files
- Test results confirming the fix works as expected
- Any architectural decisions or patterns established for webview state management
- Confirmation of successful execution with no regressions

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This includes questions about:
- VS Code webview API specifics
- Expected behavior in edge cases
- Testing requirements or scenarios
- Integration points with existing WebSocket bridge functionality