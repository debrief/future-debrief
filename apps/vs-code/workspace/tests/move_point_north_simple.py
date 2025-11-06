#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North

This example demonstrates proper type narrowing when working with
Pydantic union types for type-safe geometry manipulation.
"""

from mcp_client import MCPClient
from debrief.types.features.point import DebriefPointFeature

# Create MCP client
client = MCPClient()

# Get selected feature IDs (returns SelectionState model)
selection = client.get_selection("sample.plot.json")
selected_ids = selection.selectedIds
print(f"Selected feature IDs: {selected_ids}")

# Get the full feature collection (returns DebriefFeatureCollection model)
feature_collection = client.get_features("sample.plot.json")
selected_points = []

# Find selected point features
for feature in feature_collection.features:
    # Type narrowing: Check if this is specifically a DebriefPointFeature
    if isinstance(feature, DebriefPointFeature):
        # feature.id can be str | int | None, so check if it exists and is in selection
        if feature.id is not None and feature.id in selected_ids:
            selected_points.append(feature)

# Move selected points 100km North
for point in selected_points:
    # Type-safe access to geometry coordinates
    # After isinstance check, Pylance knows point.geometry is Point (not a union)
    if point.geometry and point.geometry.coordinates:
        lon, lat = point.geometry.coordinates
        # 100km ≈ 0.9 degrees latitude
        point.geometry.coordinates = [lon, lat + 100 / 111.32]

# Update plot and show result (accepts List[DebriefFeature])
if selected_points:
    client.update_features(selected_points, "sample.plot.json")
    print(f"✓ {len(selected_points)} points moved 100km North")
else:
    print("No point features selected")
