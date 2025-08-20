# APM Task Assignment: VS Code Extension Scaffolding

## 1. Agent Role & APM Context

* **Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Debrief VS Code Extension project.
* **Your Role:** Execute assigned tasks diligently and log work meticulously to the Memory Bank.
* **Workflow:** You interact with the Manager Agent via the User and must maintain detailed records in the Memory Bank for project continuity.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to `Phase 1: VS Code Extension Scaffolding` in the [Implementation Plan](../../vs-code/docs/implement-skeleton.md).
* **Objective:** Create a minimal working VS Code extension with sidebar container and placeholder views to lay the foundation for future postMessage and UI logic.

* **Detailed Action Steps:**
  1. Create the `vs-code/` folder structure in the mono-repo root (if not already present)
  2. Initialize VS Code extension using the TypeScript template:
     * Run `npm init @vscode` in the vs-code directory
     * Select "New Extension (TypeScript)" when prompted
  3. Clean up the generated boilerplate code:
     * Remove unused sample commands and views from the generated code
     * Create three new provider classes in `src/`: `DebriefSidebar.ts`, `OutlineViewProvider.ts`, `TimelineViewProvider.ts`
  4. Configure the extension manifest in `package.json`:
     * Register the activity bar container named "Debrief" with ID "debrief"
     * Add the Debrief icon reference: `"icon": "media/debrief-icon.svg"`
     * Register two views under the "debrief" container:
       - "debriefOutline" with name "Outline" 
       - "debriefTimeline" with name "Timeline"
     * Use the exact JSON structure provided in the skeleton for viewsContainers and views configuration

* **Provide Necessary Context/Assets:**
  * The extension should be created in the existing mono-repo structure
  * Focus on creating a minimal, functional extension that can be loaded in VS Code
  * The icon file `media/debrief-icon.svg` will be created in a future task, so use a placeholder path for now
  * Ensure the extension follows VS Code extension development best practices

## 3. Expected Output & Deliverables

* **Define Success:** A functional VS Code extension that loads without errors and displays the Debrief activity bar icon with two placeholder sidebar views (Outline and Timeline).
* **Specify Deliverables:**
  * Complete VS Code extension project structure in `vs-code/` directory
  * Properly configured `package.json` with extension manifest
  * Basic TypeScript source files for the three provider classes
  * Extension can be loaded in VS Code development mode without errors

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:
* A reference to Phase 1 of the Implementation Plan
* A clear description of the scaffolding actions taken
* Any code snippets for the key provider classes created
* Any key decisions made during the scaffolding process
* Confirmation of successful extension loading in VS Code

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.