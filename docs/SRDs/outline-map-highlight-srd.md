# Software Requirements Document (SRD)
## Feature: Outline Panel Integration with Map-Based Feature Highlighting

---

## 1. Purpose

This feature integrates the VS Code **Outline panel** with the **Debrief custom editor**, which renders a GeoJSON FeatureCollection (FC) in a Leaflet-based map. When a user selects a feature from the Outline panel, the corresponding feature is highlighted on the map.

---

## 2. Scope

This functionality applies to documents opened in the custom Debrief editor, specifically those containing a GeoJSON FeatureCollection. It enhances navigability by:

- Organising features into a structured tree grouped by geometry type
- Enabling selection of individual features via the Outline panel
- Triggering visual highlighting of features on the map

---

## 3. Functional Requirements

### 3.1 DocumentSymbolProvider

- The extension SHALL implement a `DocumentSymbolProvider` for documents opened in the custom editor.
- The provider SHALL return a nested tree of `DocumentSymbol` entries representing features in the GeoJSON.
- The top-level nodes SHALL represent `geometry.type` categories (`Point`, `LineString`, `Polygon`, etc.).
- Each child node SHALL represent a feature with a label derived from:
  - `properties.name`, if available
  - Else `properties.id`, if available
  - Else fallback to `Feature {index}`

### 3.2 Range Encoding

- The `range.start.line` of each `DocumentSymbol` SHALL encode the feature’s index in the `features[]` array.
- The `range.end.line` SHALL be set to `range.start.line + 1`.
- This index SHALL be used to identify the feature when Outline selection occurs.

### 3.3 Outline Panel Behaviour

- When a user selects a feature in the Outline panel:
  - The extension SHALL intercept the selection via `onDidChangeTextEditorSelection`.
  - The extension SHALL extract the feature index from `selection.start.line`.
  - The extension SHALL post a message to the corresponding Webview panel for the custom editor, with the selected feature index.

### 3.4 Map Highlighting

- The webview (Leaflet map) SHALL listen for a message of type `highlightFeature` with the feature index.
- Upon receiving the message:
  - The map SHALL visually highlight the specified feature using a **thicker line or glow effect**.
  - The map SHALL NOT pan or zoom automatically.
  - The highlight SHALL persist until manually cleared.

### 3.5 Highlight Persistence

- The highlighted feature SHALL remain active:
  - Until the user manually clears the selection (e.g., via Escape key, click-away, or map UI).
  - The extension SHALL NOT automatically remove the highlight.

### 3.6 Selection Handling

- If the user rapidly selects multiple Outline entries:
  - The system SHALL immediately switch highlight to each selected feature.
  - No debouncing or queuing SHALL occur.

### 3.7 Context Menu Actions (Future)

- Each feature node in the Outline panel MAY support additional context menu actions.
- Planned options include:
  - `Pin Feature`
  - `Export as CSV`
  - `Copy Feature ID`

---

## 4. Non-Functional Requirements

- The feature SHALL introduce no noticeable latency in Outline selection or map updates.
- The feature SHALL avoid side effects on document text or file contents.
- The feature SHALL degrade gracefully if the document is malformed or lacks a valid FeatureCollection.

---

## 5. Constraints

- The Outline panel supports only **single feature selection**.
- Grouping mode is fixed to `geometry.type` and SHALL NOT be configurable by the user.
- Only files opened in the custom editor are eligible for Outline population — no support for `.geojson` opened as plain JSON.

---

## 6. Out of Scope

- No support for multiple simultaneous selections
- No Outline-based zoom or map navigation
- No support for toggling grouping mode or feature filters
- No support for triggering document edits from the Outline

---

## 7. Future Enhancements (non-binding)

- Add user-selectable grouping (e.g., by platform type or mission role)
- Enable multi-feature selection via a custom TreeView
- Include property previews or icons in Outline labels

---

## 8. Acceptance Criteria

| Requirement                          | Test Case                                                                 |
|--------------------------------------|---------------------------------------------------------------------------|
| Outline shows grouped features       | User opens a valid FC document → Outline shows `Point`, `LineString` groups |
| Feature selection triggers map       | User selects a feature in Outline → Map applies highlight                 |
| Highlight is persistent              | Highlight remains until user clears it                                   |
| Fast switching is handled            | User clicks rapidly → highlight updates immediately without delay        |
| Only one feature is active           | Only one feature can be selected at a time                               |

---
