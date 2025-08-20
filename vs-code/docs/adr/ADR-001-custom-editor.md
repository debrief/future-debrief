# ADR-001: Use CustomEditor for plot editing

## Status
Accepted

## Context
We need to render and interact with `.geojson` plot files inside VS Code. VS Code offers two main mechanisms: Custom Editors and WebView panels.

## Decision
We chose to use `CustomEditorProvider` to treat `.geojson` files as first-class editor tabs. This allows proper dirty tracking, undo/redo integration, and tabbed navigation.

## Consequences
- Analysts can open multiple plots in editor tabs.
- Saves are integrated with VS Code’s workflow.
- We must implement the full editor lifecycle, including save and backup.