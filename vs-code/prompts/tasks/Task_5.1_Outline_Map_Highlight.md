# APM Task Assignment: Outline Panel Integration with Map-Based Feature Highlighting

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** You will execute the assigned task diligently, implementing the outline panel integration feature that enables map-based feature highlighting. Your work must be thorough, well-documented, and follow established architectural patterns.

**Workflow:** You will work independently on this task and report back to the Manager Agent (via the User) upon completion. All work must be logged comprehensively in the Memory Bank for future reference and project continuity.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to the Outline Panel Integration with Map-Based Feature Highlighting feature as detailed in `docs/SRDs/outline-map-highlight-srd.md`.

**Objective:** Implement a comprehensive integration between the VS Code Outline panel and the Debrief custom editor's Leaflet-based map, allowing users to select GeoJSON features from the Outline panel and see them highlighted on the map.

**Detailed Action Steps:**

1. **Implement DocumentSymbolProvider:**
   - Create a `DocumentSymbolProvider` class that processes GeoJSON FeatureCollection documents
   - Generate a nested tree structure with top-level nodes representing geometry types (`Point`, `LineString`, `Polygon`, etc.)
   - Create child nodes for individual features with labels derived from:
     - `properties.name` (primary)
     - `properties.id` (secondary)
     - `Feature {index}` (fallback)
   - Encode feature indices in `range.start.line` for selection tracking

2. **Implement Selection Event Handling:**
   - Set up `onDidChangeTextEditorSelection` event listener
   - Extract feature index from `selection.start.line`
   - Post messages to the corresponding webview panel with selected feature index

3. **Enhance Webview Map Integration:**
   - Add message listener for `highlightFeature` message type
   - Implement visual highlighting using thicker lines or glow effects
   - Ensure highlights persist until manually cleared
   - Support rapid feature switching without debouncing

4. **Error Handling and Edge Cases:**
   - Handle malformed GeoJSON gracefully
   - Ensure no side effects on document text or file contents
   - Maintain performance with no noticeable latency

**Provide Necessary Context/Assets:**
- Review existing custom editor implementation patterns in the codebase
- Examine current webview message passing mechanisms
- Reference existing DocumentSymbolProvider implementations if available
- Ensure compatibility with the established Leaflet map rendering architecture

## 3. Expected Output & Deliverables

**Define Success:** The feature is successfully implemented when:
- The Outline panel displays a structured tree of GeoJSON features grouped by geometry type
- Selecting a feature in the Outline panel highlights the corresponding feature on the map
- Highlights persist until manually cleared
- The system handles rapid feature switching smoothly
- No performance degradation is introduced

**Specify Deliverables:**
- Modified/new TypeScript files implementing the DocumentSymbolProvider
- Enhanced webview JavaScript code for map highlighting
- Updated extension registration code for the new provider
- Any necessary type definitions or interfaces
- Working integration that passes all acceptance criteria from the SRD

**Format:** All code must follow the existing project's TypeScript coding standards and architectural patterns.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

Adhere strictly to the established logging format. Ensure your log includes:
- A reference to the Outline Panel Integration task
- A clear description of the actions taken and components implemented
- Key code snippets for the DocumentSymbolProvider and message handling
- Any architectural decisions made or challenges encountered
- Confirmation of successful execution with test results
- Integration points with existing custom editor functionality

Reference the [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md) for detailed formatting requirements.

## 5. Acceptance Criteria Validation

Ensure your implementation meets all acceptance criteria from the SRD:

| Requirement | Validation |
|-------------|------------|
| Outline shows grouped features | Verify grouping by geometry type (`Point`, `LineString`, etc.) |
| Feature selection triggers map highlight | Test selection → highlight functionality |
| Highlight persistence | Confirm highlights remain until manually cleared |
| Fast switching handling | Test rapid clicks without delay or issues |
| Single feature selection | Ensure only one feature can be selected at a time |

## 6. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Integration points with existing custom editor architecture
- Specific message passing protocols already established
- Performance requirements and constraints
- Testing methodology preferences for this feature