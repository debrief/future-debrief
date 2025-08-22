# APM Task Assignment: Leaflet Map Integration for Debrief Editor

## 1. Onboarding / Context from Prior Work

The Debrief custom editor has been established with robust state tracking capabilities from Phase 4. The current state includes:
* Custom text editor provider implemented in `DebriefEditorProvider.ts` handling `.plot.json` files
* Active editor monitoring with FeatureCollection extraction and sidebar synchronization
* Webview-based JSON display with syntax highlighting and error handling
* TypeScript build process using both Webpack (extension) and Vite (webview components)
* Established patterns for webview HTML generation and message passing

This task builds upon that foundation to replace the JSON display with an interactive Leaflet map for GeoJSON FeatureCollection visualization.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to `Phase 5: Leaflet Map Integration` based on the architectural decisions made in planning sessions.
* **Objective:** Replace the current JSON display in the Debrief custom editor with a Leaflet-based interactive map that visualizes GeoJSON FeatureCollection data, with progressive enhancement for full interaction capabilities.

* **Detailed Action Steps:**

  **Phase 5.1: Foundation (Current Task)**
  1. **Add Leaflet Dependency:**
     * Add `leaflet` package via yarn to `package.json`
     * Include TypeScript definitions (`@types/leaflet`) for development
     * Guidance: Use standard Leaflet package for maximum compatibility and stability

  2. **Create Maps Module Structure:**
     * Create `src/maps/` directory following the established pattern
     * Create `src/maps/webview/` subdirectory for frontend TypeScript files
     * Establish the layer separation architecture as planned:
       - `maps/MapWebviewProvider.ts` (VS Code integration - webpack build)
       - `maps/webview/MapApp.ts` (main frontend component - Vite build)
       - `maps/webview/LeafletManager.ts` (map lifecycle management)
       - `maps/webview/GeoJSONRenderer.ts` (data handling and rendering)

  3. **Configure Build Process:**
     * Update Vite configuration to build map components as `media/map-components.js`
     * Ensure TypeScript compilation for all map-related files
     * Follow the dual build pattern: backend via webpack, frontend via Vite
     * Guidance: Mirror the existing outline/timeline build pattern for consistency

  4. **Implement Basic Map Display:**
     * Replace JSON display HTML in `DebriefEditorProvider.getHtmlForWebview()` with map container
     * Initialize Leaflet map with OpenStreetMap tiles (standard configuration)
     * Implement lazy loading initialization - map creation only when container becomes visible
     * Include basic error handling with fallback to JSON view for invalid data
     * Guidance: Always show map container, use OpenStreetMap default tiles, no theme integration in this phase

  5. **Integrate with Existing Message System:**
     * Utilize existing `updateWebview()` messaging pattern from `DebriefEditorProvider`
     * Handle `{type: 'update', parsedJson, isValidJson}` messages in map components
     * Implement GeoJSON detection and rendering for valid FeatureCollection data
     * Provide fallback display for non-GeoJSON content

* **Provide Necessary Context/Assets:**
  * Reference existing webview patterns in `src/webview/outline/` and `src/webview/timeline/`
  * Follow established TypeScript patterns and build configurations
  * Maintain consistency with existing VS Code webview security practices
  * The system should handle the same `.plot.json` files currently processed by the editor
  * Consider Content Security Policy requirements for external tile servers
  * Map should occupy the same space currently used by JSON display

## 3. Expected Output & Deliverables

* **Define Success:** The Debrief custom editor displays an interactive Leaflet map instead of JSON content, successfully rendering GeoJSON FeatureCollection data with basic pan/zoom functionality, while maintaining fallback to JSON view for invalid data.

* **Specify Deliverables:**
  * Updated `package.json` with Leaflet dependencies
  * Complete maps module structure with all TypeScript files
  * Modified `DebriefEditorProvider.ts` with new HTML template including map container
  * Updated Vite configuration producing `media/map-components.js`
  * Functional Leaflet map displaying in custom editor webview
  * GeoJSON rendering for valid FeatureCollection data
  * Error handling and JSON fallback for invalid content
  * Successful compilation and basic functionality demonstration

* **Format:** All TypeScript code following existing project conventions, proper error handling, and comprehensive logging.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:
* A reference to Phase 5.1 Leaflet Map Integration
* Complete description of the maps module architecture created
* Key code snippets for the Leaflet initialization and GeoJSON rendering
* Build configuration changes made to Vite and any webpack modifications
* Any architectural decisions regarding lazy loading, error handling, or fallback mechanisms
* Confirmation of successful map display replacing JSON view
* Performance considerations and any optimization decisions made

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. This is a significant architectural change that replaces existing functionality, so clarity is essential for successful execution.