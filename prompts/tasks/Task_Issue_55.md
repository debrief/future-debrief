# APM Task Assignment: Refactor MapComponent Feature Rendering

## 1. Agent Role & APM Context

**Introduction:** You are activated as an Implementation Agent within the Agentic Project Management (APM) framework for the Future Debrief MapComponent refactoring project.

**Your Role:** You will execute this assigned task diligently by refactoring the feature rendering in MapComponent into separate React components, each designed for specific dataType features with proper React-Leaflet component composition.

**Workflow:** You will work with the Manager Agent (via the User) and document your progress meticulously in the Memory Bank upon completion.

## 2. Task Assignment

**Reference GitHub Issue:** This assignment corresponds to [GitHub Issue #55: Refactor MapComponent](https://github.com/debrief/future-debrief/issues/55).

**Objective:** Break down the monolithic feature rendering logic in MapComponent into separate, reusable React components that handle specific `feature.properties.dataType` values, while maintaining backward compatibility and following React-Leaflet best practices.

**Current State Analysis:**
- The MapComponent in `libs/web-components/src/MapComponent/MapComponent.tsx:438-582` contains a single `InteractiveGeoJSON` component that handles all feature rendering
- Current implementation includes inline styling logic for points, lines, and polygons based on feature properties
- Feature rendering logic is embedded within the `pointToLayer`, `geoJsonStyle`, and `onEachFeature` callbacks
- The component respects standard formatting like `feature.properties.color`, `feature.properties.visible`, `marker-color`, `stroke`, `fill`, etc.

**Detailed Action Steps:**

1. **Analyze Current Feature Rendering Logic:**
   - Review the existing rendering logic in `InteractiveGeoJSON` component (`MapComponent.tsx:183-436`)
   - Document the current feature type detection patterns (buoyfield, point markers, tracks, zones)
   - Identify common styling properties used: `color`, `marker-color`, `stroke`, `fill`, `fill-opacity`, `visible`
   - Map the current geometry type handling: Point, LineString, MultiLineString, Polygon, MultiPolygon

2. **Design Component Architecture:**
   - Create separate React components for different `feature.properties.dataType` values (extending `DebriefFeature`):
     - `TrackRenderer` for track/path features (typically LineString/MultiLineString geometry)
     - `PointRenderer` for point-based features (Point/MultiPoint geometry)
     - `ZoneRenderer` for area/annotation features (Polygon/MultiPolygon geometry)
   - Design a `FeatureRendererFactory` or similar pattern to dynamically select the appropriate renderer
   - Plan for fallback to standard leaflet GeoJSON layer for unrecognized dataTypes

3. **Create Feature-Specific Renderer Components:**

   - **DebriefFeature** Create a core React component to act as a base class for these features 
     - this will hold the core capabilities of existing `InteractiveGeoJSON` class
     - Other debrief-feature classes will extend it

   - **TrackRenderer:** Compose React-Leaflet `Polyline`/`MultiPolyline` components with track-specific styling
     - Support `feature.properties.stroke` for line color
     - Handle track selection and highlighting
     - Consider time-based track styling if properties indicate temporal data
     - Implement selection highlighting with white borders
   
   - **PointRenderer:** Compose React-Leaflet `CircleMarker`/`Marker` components
     - Support `feature.properties.color`
     - Handle buoyfield-specific smaller radius (5px) vs standard points (8px)
     - Implement selection highlighting with white borders
   
   - **ZoneRenderer:** Compose React-Leaflet `Polygon` components for area features
     - Support `feature.properties.fill`, `feature.properties.stroke`, `feature.properties.fill-opacity`
     - Handle zone annotation display and interaction
     - Implement selection highlighting with white borders

4. **Implement Renderer Factory Pattern:**
   - Create a mechanism to select appropriate renderer based on `feature.properties.dataType`
   - Iterates through features:
     - Selects appropriate renderer for each feature
     - Falls back to standard `GeoJSON` component for unrecognized types
     - Preserves existing selection, highlighting, and event handling

5. **Preserve Existing Functionality:**
   - Maintain all current feature interaction patterns (click selection, highlighting)
   - Preserve popup binding for features with `feature.properties.name`
   - Keep existing selection styling (white borders, increased opacity)
   - Maintain feature bounds calculation and auto-fitting behavior
   - Respect `feature.properties.visible` filtering

6. **Ensure Standard Property Support:**
   - All renderers must observe standard GeoJSON styling properties:
     - `feature.properties.color` (general color)
     - `feature.properties.visible` (visibility toggle)
     - `feature.properties.marker-color` (for points)
     - `feature.properties.stroke` (for lines/borders)
     - `feature.properties.fill` (for area fill)
     - `feature.properties.fill-opacity` (for area transparency)

**Technical Requirements:**
- Use React-Leaflet components as building blocks (Polyline, CircleMarker, Polygon, etc.)
- Maintain TypeScript compatibility with existing `GeoJSONFeature` interface
- Preserve all existing callback signatures: `onSelectionChange`, `onMapClick`, etc.
- Ensure no breaking changes to the public `MapComponent` API
- Follow React component composition patterns for maintainability

**Key Files to Modify:**
- `libs/web-components/src/MapComponent/MapComponent.tsx` (primary component refactoring)
- Create new files under `libs/web-components/src/MapComponent/renderers/` for individual renderer components

**Reference Materials:**
- External examples exist at `https://github.com/debrief/reactol/tree/main/src/components/spatial` but may not be directly accessible
- Current MapComponent implementation demonstrates React-Leaflet usage patterns
- React-Leaflet documentation for component composition patterns

## 3. Expected Output & Deliverables

**Define Success:** The MapComponent maintains all existing functionality while using a modular, extensible architecture where different feature types are rendered by specialized React components composed of React-Leaflet primitives.

**Specify Deliverables:**
- Refactored `MapComponent.tsx` with modular renderer architecture
- Individual renderer components: `TrackRenderer`, `PointRenderer`, `ZoneRenderer`
- `FeatureRendererFactory` or similar coordinator component
- Preserved backward compatibility with existing MapComponent API
- Updated component organization under `renderers/` subdirectory

**Verification Steps:**
- All existing MapComponent functionality works unchanged
- Different feature types render using appropriate specialized components
- Standard GeoJSON properties (`color`, `visible`, etc.) are respected
- Selection, highlighting, and interaction behaviors are preserved
- Unrecognized feature types fall back to standard GeoJSON rendering
- Component passes all existing tests

## 4. Memory Bank Logging Instructions

Upon successful completion of this task, you **must** log your work comprehensively to the project's Memory Bank file. Adhere strictly to the established logging format and ensure your log includes:

- A reference to GitHub Issue #55 and this task assignment
- A clear description of the renderer architecture implemented
- Code snippets showing the key component structure and renderer factory pattern
- Documentation of how different `dataType` values map to specific renderers
- Any challenges encountered during React-Leaflet component composition
- Confirmation of preserved functionality and backward compatibility
- List of new files created and their purposes

## 5. Clarification Instruction

If any part of this task assignment is unclear, particularly regarding the renderer architecture design, specific dataType handling requirements, or React-Leaflet component composition patterns, please state your specific questions before proceeding.