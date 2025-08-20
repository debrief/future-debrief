# APM Task Assignment: React Setup for Outline & Timeline Views

## 1. Onboarding / Context from Prior Work

The VS Code extension scaffolding has been completed in Phase 1. The basic extension structure is now in place with:
* VS Code extension project initialized in `vs-code/` directory
* Extension manifest configured in `package.json` with Debrief activity bar container
* Two sidebar views registered: "debriefOutline" and "debriefTimeline" 
* Basic provider classes: `DebriefSidebar.ts`, `OutlineViewProvider.ts`, `TimelineViewProvider.ts`

This task builds upon that foundation to add React-based WebView content for the sidebar views.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to `Phase 2: React Setup for Outline & Timeline Views` in the [Implementation Plan](../../vs-code/docs/implement-skeleton.md).
* **Objective:** Set up Vite + React for each sidebar WebView, show placeholder content for Outline and Timeline, and enable dynamic style updates for VS Code theme.

* **Detailed Action Steps:**
  1. Set up Vite workspace configuration for both `Outline` and `Timeline` WebViews:
     * Create separate Vite configurations for each view to enable independent builds
     * Configure build outputs to generate `media/outline.js` and `media/timeline.js`
  2. Install and configure build optimization:
     * Use `esbuild-style` or `vite-plugin-monaco-editor` for optimized WebView builds
     * Ensure builds are optimized for VS Code WebView environment
  3. Create React application structure:
     * Create `src/webview/outline/index.tsx` with placeholder content:
       ```tsx
       <div className="panel-content">Outline view not yet implemented.</div>
       ```
     * Create `src/webview/timeline/index.tsx` with similar placeholder structure
  4. Implement VS Code theme integration:
     * Add CSS variables that respond to VS Code theme changes
     * Ensure both views update dynamically when VS Code theme changes
  5. Add postMessage scaffolding:
     * Implement `window.addEventListener("message")` event handlers in both React apps
     * Create placeholder message handling structure for future extension-to-webview communication

* **Provide Necessary Context/Assets:**
  * The WebViews must be compatible with VS Code's security restrictions and Content Security Policy
  * React applications should be lightweight and optimized for the sidebar context
  * Consider VS Code's built-in styling system and theme variables for consistent appearance
  * WebView builds should integrate seamlessly with the existing TypeScript extension code

## 3. Expected Output & Deliverables

* **Define Success:** Both Outline and Timeline sidebar views display React-rendered placeholder content, respond to VS Code theme changes, and have scaffolded message handling ready for future phases.
* **Specify Deliverables:**
  * Vite configuration files for building WebView content
  * React applications for both Outline and Timeline views
  * Built JavaScript files in `media/outline.js` and `media/timeline.js`
  * CSS styling that integrates with VS Code themes
  * Message event listener scaffolding for future postMessage integration
  * Updated provider classes to serve the React-built WebView content

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:
* A reference to Phase 2 of the Implementation Plan
* A clear description of the React and Vite setup actions taken
* Key code snippets for the React components and Vite configuration
* Any build optimization decisions made
* Confirmation of successful WebView rendering with theme integration

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.