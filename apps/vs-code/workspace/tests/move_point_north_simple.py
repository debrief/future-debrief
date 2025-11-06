#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North

This example demonstrates how to use Pydantic types with the MCP client
for type-safe geometry manipulation.
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
    # Type-safe check if feature is selected
    if feature.id in selected_ids:
        # Check if this is a Point feature
        if isinstance(feature, DebriefPointFeature):
            selected_points.append(feature)

# Move selected points 100km North
for point in selected_points:
    # Type-safe access to geometry coordinates
    if point.geometry and hasattr(point.geometry, 'coordinates'):
        coords = point.geometry.coordinates
        # 100km ≈ 0.9 degrees latitude
        point.geometry.coordinates = [coords[0], coords[1] + 100 / 111.32]

# Update plot and show result (accepts List[DebriefFeature])
if selected_points:
    client.update_features(selected_points, "sample.plot.json")
    print(f"✓ {len(selected_points)} points moved 100km North")
else:
    print("No point features selected")
