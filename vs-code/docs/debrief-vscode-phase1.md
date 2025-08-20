# Future Debrief: Phase 1 VS Code Extension Requirements

## 🧭 Core Interaction Model

- Open `.geojson`, `.rep`, and `.dpf` files by drag-and-drop or file explorer
- If no plot is open → open as new plot  
- If a plot is open → content is added to current plot
- Each plot opens in a **custom editor tab**
- In-memory editing model; user chooses when to save
- Prompt on close if there are unsaved changes

## 🗺️ Map Capabilities

- Background tile layers (MBTiles, raster, WMS)
- Zoom/pan interaction (mouse/trackpad)
- Scale bar + coordinate readout under cursor
- Grid lines with labels (dynamically spaced)
- Layer visibility toggling via Outline panel

## 🖊️ Decorations and Tools

- Supported drawing types: text, lines, polygons, circles/range rings, labels, bearing lines, custom markers
- Range/bearing measurement tool (click two points → get distance and bearing)
- Decorations treated as GeoJSON features

## 🧩 Panel Layout

- Custom **sidebar tab** includes:
  - Time controller (window definition, playback, timeline scrubber)
  - Outline view
  - Properties/detail panel
  - (Future) Toolbox panel

## 🧪 Tool Integration

- Phase 1: Tool results shown directly on the map (no preview mode)
- Output is automatically added to current plot in memory
- Tool launching via:
  - Toolbox panel
  - Command palette (`Debrief: Run Tool`)
  - Context menu on features

## 🔃 Import & Update

- Add data via:
  - Drag/drop `.geojson`, `.rep`, `.dpf`
  - Browse local folders or STAC (later)
- STAC support deferred from Phase 1
- Offline updates via:
  - Internal MOD network sync
  - “Import update package” command

## 🎨 Styling

- Track filtering/styling via:
  - Context menus in Outline
  - Property editor for precision edits
- Styling presets not supported initially

## ⌛ Time Controls

- Define time window with forward/back controls
- Playback/animation mode
- Timeline slider for manual scrubbing

## ⚙️ Deployment

- Initial delivery: unsigned `.vsix` for manual install
- Later: pre-packaged VS Code bundle with:
  - Debrief extension + ToolVault
  - Sample plots, base tiles, docs
- “Tools-included” bundle adds Python runtime
- Configuration via `settings.json` initially; GUI config added later

## 🛠️ Diagnostics

- Logs output to VS Code `Output` tab (extension channel)
- No separate diagnostics UI in Phase 1

## ❌ Deferred for Phase 1

- Collaboration and locking
- Storyboard editing
- Feature comparison tools
- Styling presets
- Validation/enrichment beyond basics
- Advanced accessibility support