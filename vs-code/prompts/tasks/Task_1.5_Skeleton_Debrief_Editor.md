# APM Task Assignment: Skeleton Debrief Editor

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.

**Your Role:** Execute the assigned tasks diligently and log work meticulously to support project continuity and knowledge management.

**Workflow:** You will receive task assignments from the Manager Agent (via the User) and must document all work in the Memory Bank for future agents and project tracking.

## 2. Task Assignment

**Reference Implementation Plan:** This assignment corresponds to `Phase 1.5: Skeleton Debrief Editor` in the implementation skeleton (docs/implement-skeleton.md).

**Objective:** Create a basic custom editor for `.plot.json` files that provides a read-only view of file content and registers as the default handler for `.plot.json` files.

**Detailed Action Steps:**

1. **Create DebriefEditorProvider.ts:**
   - Create `src/DebriefEditorProvider.ts` that implements `vscode.CustomTextEditorProvider`
   - The provider must handle custom text editor functionality for plot files

2. **Register Custom Editor in package.json:**
   - Add custom editor configuration to `package.json` with the following specification:
     ```json
     "customEditors": [
       {
         "viewType": "debrief.plotEditor",
         "displayName": "Debrief Plot Editor",
         "selector": [
           { "filenamePattern": "*.plot.json" }
         ]
       }
     ]
     ```

3. **Create Webview HTML:**
   - Develop webview HTML with basic styling to display JSON content
   - Ensure the styling is consistent with VS Code's theme system
   - The view should be read-only and properly formatted for JSON display

4. **Implement resolveCustomTextEditor Method:**
   - Implement the `resolveCustomTextEditor` method to:
     - Load document content from the file system
     - Display formatted JSON in a read-only editor interface
     - Handle theme changes to maintain consistent VS Code styling
     - Ensure proper error handling for malformed JSON files

5. **Register Provider in extension.ts:**
   - Add the following registration code to `extension.ts`:
     ```typescript
     vscode.window.registerCustomEditorProvider(
       'debrief.plotEditor', 
       new DebriefEditorProvider()
     );
     ```
   - Ensure proper import statements and error handling

**Provide Necessary Context/Assets:**
- The extension should build upon the existing VS Code extension scaffolding from Phase 1
- Use TypeScript for all implementation
- Follow VS Code extension development best practices for custom editors
- Ensure the editor integrates properly with VS Code's document management system
- The webview should use VS Code's built-in CSS variables for theming consistency

## 3. Expected Output & Deliverables

**Define Success:** Successful completion means:
- `.plot.json` files open in the custom Debrief Plot Editor by default
- The editor displays JSON content in a readable, formatted manner
- The editor respects VS Code theme changes
- No compilation errors or runtime exceptions

**Specify Deliverables:**
- `src/DebriefEditorProvider.ts` - Complete custom editor provider implementation
- Modified `package.json` - Updated with custom editor registration
- Modified `src/extension.ts` - Updated with provider registration
- Any additional HTML/CSS files needed for the webview
- Functional custom editor that can be tested by opening a `.plot.json` file

**Format:** All code should follow TypeScript best practices and VS Code extension conventions.

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file.

**Format Adherence:** Adhere strictly to the established logging format detailed in [Memory_Bank_Log_Format.md](../02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md). Ensure your log includes:
- A reference to Phase 1.5: Skeleton Debrief Editor
- A clear description of the actions taken
- Key code snippets for the custom editor implementation
- Any decisions made regarding webview styling or JSON formatting
- Confirmation of successful execution (e.g., editor opens .plot.json files correctly)
- Any challenges encountered during VS Code API integration

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.