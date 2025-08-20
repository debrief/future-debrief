# Debrief VS Code Extension — Architecture Summary

This document outlines the core architecture and API choices for the Debrief VS Code extension (Phase 1).

## 📁 Project Structure

```
vs-code/
├── .vscode/                 # Debug config
├── src/
│   ├── extension/           # Extension backend logic
│   ├── views/               # Outline, Time, Properties, Toolbox panels
│   ├── webview-ui/          # React + Leaflet map editor
│   └── shared/              # Types, utils, common logic
├── public/                  # Static assets (icons, tiles, etc.)
├── package.json             # VS Code extension manifest
├── tsconfig.json            # TS config
└── webpack.config.js        # Build config (e.g., for Vite or Webpack)
```

## 🧩 Core Components

- **CustomEditorProvider** for `.geojson`, `.rep`, `.dpf`
- **WebviewViewProvider** for side panels (Outline, Time, Toolbox, Properties)
- **React + Leaflet** frontend, built with TypeScript and `react-leaflet`
- **Undo/Redo** stack per document
- **Optional Audit Log** written to `properties.audit[]` inside GeoJSON

## 🧠 Architectural Decisions

- [ADR-001: Use CustomEditor for plot editing](adr/ADR-001-custom-editor.md)
- [ADR-002: Use React + Leaflet for WebView frontend](adr/ADR-002-webview-framework.md)
- [ADR-003: Store undo and audit logs separately](adr/ADR-003-undo-audit-split.md)
- [ADR-004: Support legacy file types via import-on-open](adr/ADR-004-import-legacy.md)

## 🧬 File Lifecycle

- Files opened via `CustomEditorProvider`
- `.rep` and `.dpf` files auto-imported to `.geojson`
- In-memory edits, saved on demand (or via auto-save)
- Undo/Redo managed via `CustomDocumentEdit`
- Optional crash-safe backup via `backup()`

## 📡 Messaging Model

- WebView ↔ Extension via `postMessage`
- Sidebar panels access current editor using `onDidChangeActiveTextEditor`
- Editor exposes methods like `getCurrentTime()`, `getSelectedFeature()`, etc.

## 🧭 Tool Integration

- Toolbox view shows available tools (initially from bundled ToolVault)
- Tools run against selected data in current plot
- Results are added directly to map
- Commands registered statically and dynamically

## 🛠️ Additional Notes

- Future STAC integration deferred for now
- Storyboards deferred
- Styling presets and comparison tools deferred
- Minimal shared state — editor is source of truth