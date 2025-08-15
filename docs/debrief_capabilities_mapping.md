# Debrief Capabilities Mapping

This table maps existing or planned Debrief capabilities to whether they could be moved into the Toolbox service or must remain UI-bound.

| Capability | Classification |
|------------|----------------|
| Track resampling / smoothing | Toolbox candidate |
| Interpolation / extrapolation of missing points | Toolbox candidate |
| Bearing / range calculations between tracks | Toolbox candidate |
| Track splitting / merging | Toolbox candidate |
| Detecting outliers and removing them | Toolbox candidate |
| Track simplification (reduce vertex count) | Toolbox candidate |
| Bulk creation of range/bearing plots from events | Toolbox candidate |
| Event enrichment (link to external references, add computed fields) | Toolbox candidate |
| Annotation promotion/demotion | Toolbox candidate |
| Platform lookup from MMSI / callsign | Toolbox candidate |
| Environmental data correlation (METOC overlays, bathymetry intersections) | Toolbox candidate |
| Performance vs official specs calculations | Toolbox candidate |
| Civilian shipping pattern comparison | Toolbox candidate |
| Import REP, DPF, OpRep, KML, CSV → GeoJSON | Toolbox candidate |
| Export GeoJSON, KML, HTML bundle, CSV summaries, storyboard packages | Toolbox candidate |
| File metadata extraction (classification, exercise/serial names, dates) | Toolbox candidate |
| Generate storyboard skeleton from a FeatureCollection | Toolbox candidate |
| Render static HTML bundle from a plot definition | Toolbox candidate |
| Generate screenshot sequence from saved steps | Toolbox candidate |
| Range/bearing plots for main participants | Toolbox candidate |
| Outlier detection in positions / speeds / depths | Toolbox candidate |
| Formatting tracks & plots to standards | Toolbox candidate |
| Under-utilised analyses (find detection gaps, etc.) | Toolbox candidate |
| Schema validation for FeatureCollections | Toolbox candidate |
| Consistency checks (timestamps, CRS, properties) | Toolbox candidate |
| Audit log summarisation / change diff reports | Toolbox candidate |
| Interactive timeline control | UI-bound |
| Event viewer with click-to-focus | UI-bound |
| Manual track geometry editing (drag vertices) | UI-bound |
| Interactive map layers & styling control | UI-bound |
| Presence indicators in collaborative mode | UI-bound |
| Storyboard editing UI | UI-bound |
| Interactive annotation placement and resizing | UI-bound |
| Event filtering by type, time, or proximity to tracks | UI-bound (for interactivity) |
| Time window cropping | UI-bound (low CPU requirement, interactivity of value) |
