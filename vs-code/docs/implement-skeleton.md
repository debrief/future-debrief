# Debrief VS Code Extension: Initial Work Plan

## 🧱 Phase 1: VS Code Extension Scaffolding

### ✅ Goals
- Minimal working extension with sidebar container and placeholder views
- Lay foundation for future postMessage and UI logic

### Tasks
1. Create folder `vs-code/` in mono-repo
2. Initialise VS Code extension:
   ```bash
   npm init @vscode
   # Select: New Extension (TypeScript)
   ```
3. Clean up boilerplate:
   - Remove unused sample commands and views
   - Add `DebriefSidebar`, `OutlineViewProvider`, `TimelineViewProvider` in `src/`
4. In `package.json`:
   - Register activity bar container `Debrief`
   - Register two views:
     ```json
     "viewsContainers": {
       "activitybar": [
         { "id": "debrief", "title": "Debrief", "icon": "media/debrief-icon.svg" }
       ]
     },
     "views": {
       "debrief": [
         { "id": "debriefOutline", "name": "Outline" },
         { "id": "debriefTimeline", "name": "Timeline" }
       ]
     }
     ```

---

## 🧭 Phase 2: React Setup for Outline & Timeline Views

### ✅ Goals
- Set up Vite + React for each sidebar WebView
- Show placeholder content for Outline and Timeline
- Dynamic style updates for VS Code theme

### Tasks
1. Set up Vite workspace for `Outline` and `Timeline`
2. Use `esbuild-style` or `vite-plugin-monaco-editor` for optimized build
3. Output builds to `media/outline.js`, `media/timeline.js`
4. Inside `src/webview/outline/index.tsx`, render:
   ```tsx
   <div className="panel-content">Outline view not yet implemented.</div>
   ```
5. Repeat for Timeline
6. Add `window.addEventListener("message")` scaffolding for future messages

---

## 📡 Phase 3: postMessage Pipeline (Extension → WebView)

### ✅ Goals
- Allow extension to push editor state into side panels
- WebViews update their React state accordingly

### Tasks
1. In `OutlineViewProvider`, implement `webview.postMessage({ command: ..., value: ... })`
2. Inside React app, use `window.addEventListener("message", ...)`
3. Define and type `SidebarMessage` interface shared across modules

---

## 🧠 Phase 4: Editor State Tracking

### ✅ Goals
- Detect editor changes and extract metadata
- Push relevant changes into sidebars

### Tasks
1. Listen to `vscode.window.onDidChangeActiveTextEditor`
2. Verify file type is Debrief (`.plot.json`, `.rep`, `.dpf`)
3. Extract current time, selected track, etc.
4. Push messages to Outline and Timeline views
5. Consider exposing editor-specific API methods for granular state (later)

---

## 📌 Notes
- Each sidebar view manages its own message pipeline
- Editor-to-sidebar messaging uses `postMessage`
- React apps will respect VS Code theme and update dynamically
- Multiple plots may be open, but sidebars sync to active one only
