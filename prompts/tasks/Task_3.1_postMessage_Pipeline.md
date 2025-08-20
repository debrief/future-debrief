# APM Task Assignment: postMessage Pipeline (Extension → WebView)

## 1. Onboarding / Context from Prior Work

The React setup for Outline and Timeline views has been completed in Phase 2. The current state includes:
* Vite + React applications set up for both sidebar WebViews
* Placeholder content rendering in both Outline and Timeline views
* VS Code theme integration with dynamic style updates
* Basic message event listener scaffolding implemented in both React apps

This task builds upon that foundation to establish a robust communication pipeline between the VS Code extension and the WebView components.

## 2. Task Assignment

* **Reference Implementation Plan:** This assignment corresponds to `Phase 3: postMessage Pipeline (Extension → WebView)` in the [Implementation Plan](../../vs-code/docs/implement-skeleton.md).
* **Objective:** Allow the extension to push editor state into side panels and enable WebViews to update their React state accordingly.

* **Detailed Action Steps:**
  1. Implement extension-side message sending:
     * In `OutlineViewProvider`, implement `webview.postMessage({ command: ..., value: ... })` functionality
     * In `TimelineViewProvider`, implement similar postMessage functionality
     * Ensure messages follow a consistent structure across both providers
  2. Enhance WebView-side message handling:
     * Upgrade the existing `window.addEventListener("message", ...)` scaffolding in both React apps
     * Implement proper message parsing and React state updates based on received messages
     * Add error handling for malformed or unexpected messages
  3. Create shared message interface:
     * Define and type a `SidebarMessage` interface that can be shared across extension and WebView modules
     * Include common message types such as: editor state updates, file changes, selection changes
     * Ensure type safety between extension and WebView communication
  4. Implement bidirectional communication foundation:
     * Set up the basic infrastructure for WebView-to-extension messaging (for future phases)
     * Ensure message pipeline is robust and can handle multiple message types

* **Provide Necessary Context/Assets:**
  * Messages should be structured to support different types of editor state updates
  * Consider VS Code WebView security restrictions when designing the message pipeline
  * The message interface should be extensible for future functionality
  * Both providers should handle message sending in a consistent manner
  * Error handling should be implemented to prevent message pipeline failures

## 3. Expected Output & Deliverables

* **Define Success:** The extension can successfully send structured messages to both WebView panels, and the React applications can receive, parse, and respond to these messages by updating their state.
* **Specify Deliverables:**
  * Enhanced `OutlineViewProvider` and `TimelineViewProvider` with postMessage functionality
  * Updated React applications with robust message handling
  * Typed `SidebarMessage` interface shared across modules
  * Working demonstration of extension-to-WebView communication
  * Error handling and message validation implemented

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's [Memory_Bank.md](../../Memory_Bank.md) file. Adhere strictly to the established logging format. Ensure your log includes:
* A reference to Phase 3 of the Implementation Plan
* A clear description of the postMessage pipeline implementation
* Code snippets for the message interface and key communication functions
* Any architectural decisions made regarding message structure
* Confirmation of successful bidirectional communication testing

## 5. Clarification Instruction

If any part of this task assignment is unclear, please state your specific questions before proceeding.