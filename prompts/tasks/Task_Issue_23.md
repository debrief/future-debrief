# APM Task Assignment: Add Debrief Activity Panel to VS Code Extension

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** Execute assigned tasks diligently focusing on implementing the new Debrief Activity Panel feature, and log work meticulously to maintain project continuity.

**Workflow:** You will interact with the Manager Agent (via the User) and contribute your work findings to the Memory Bank for future reference and handoffs.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to GitHub Issue #23: "Add new activity panel, storing Debrief specific forms/controls"

**Objective:** Create a dedicated Activity Bar for Debrief containing three inter-related panels (TimeController, Outline, and PropertiesView) that are visible simultaneously and react to the current Debrief Editor state.

**Detailed Action Steps:**

1. **Configure Activity Bar Container:**
   - Add `contributes.viewsContainers.activitybar` configuration to `apps/vs-code/package.json`
   - Set activity ID as `debrief`
   - Set activity title as "Debrief"  
   - Configure icon path to `apps/vs-code/media/debrief-icon.svg`
   - Ensure visibility is set to always visible once extension is activated

2. **Configure Individual Panel Views:**
   - Add `contributes.views` configuration in `apps/vs-code/package.json` for three panels:
     - **TimeController**: `debrief.timeController` (WebView, fixed size, collapsible)
     - **Outline**: `debrief.outline` (Tree View, resizable and collapsible)
     - **PropertiesView**: `debrief.propertiesView` (WebView, resizable and collapsible)

3. **Implement View Registration and Lifecycle:**
   - Modify `apps/vs-code/src/extension.ts` to register the three view providers
   - Create placeholder implementations for each panel:
     - TimeController WebView provider with fixed sizing constraints
     - Outline TreeView provider leveraging existing outline infrastructure
     - PropertiesView WebView provider with resize capabilities
   - Ensure proper activation and deactivation lifecycle management

4. **Establish State Integration Foundation:**
   - Implement basic state tracking for current Debrief Editor panel
   - Set up event listeners for editor changes
   - Create framework for panels to register for state change notifications (`time`, `viewport`, `selection`, `featureCollection`)
   - Ensure panels update when new editor becomes current

**Provide Necessary Context/Assets:**

- **Existing Architecture:** The extension already has WebSocket integration (`debriefWebSocketServer.ts`), plot JSON editor (`plotJsonEditor.ts`), and outline provider (`customOutlineTreeProvider.ts`) that can be leveraged
- **Icon Asset:** Confirm `apps/vs-code/media/debrief-icon.svg` exists and is properly formatted
- **Current Package Configuration:** Review existing `package.json` structure for proper contribution points
- **Extension Entry Point:** `apps/vs-code/src/extension.ts` contains the main activation logic

## 3. Expected Output & Deliverables

**Define Success:** 
- Activity present in VS Code Activity Bar with correct Debrief icon
- When Activity opens, shows placeholders for all 3 child components with proper sizing behavior
- Panels respond to basic editor state changes (even if just placeholder responses)

**Specify Deliverables:**
1. Modified `apps/vs-code/package.json` with proper view container and view contributions
2. Updated `apps/vs-code/src/extension.ts` with view provider registrations
3. Three placeholder view provider files:
   - TimeController WebView provider (fixed size implementation)
   - Enhanced Outline TreeView provider (building on existing outline)
   - PropertiesView WebView provider (resizable implementation)
4. Basic state management integration for editor tracking

**Format:** Standard TypeScript/JavaScript files following existing code conventions in the VS Code extension codebase.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format. Ensure your log includes:
- A reference to GitHub Issue #23 and this task assignment
- A clear description of the actions taken for each panel implementation
- Key code snippets for the package.json contributions and view provider registrations
- Any architectural decisions made regarding state management integration
- Confirmation of successful execution (extension loads, activity bar appears, panels display)
- Any challenges encountered during WebView or TreeView implementation

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding. Pay particular attention to:
- Sizing constraints and resize behavior expectations for each panel type
- State integration patterns that should align with existing editor architecture
- Icon path resolution and asset management requirements