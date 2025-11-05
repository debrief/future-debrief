#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North
"""

from mcp_client import MCPClient

# Create MCP client
client = MCPClient()

# Get selected feature IDs
selection = client.get_selection("sample.plot.json")
selected_ids = selection.get('selectedIds', [])
print(f"Selected feature IDs: {selected_ids}")

# Get the full feature collection to access selected features
fc = client.get_features("sample.plot.json")
selected_points = []

# Find selected point features
for feature in fc.get('features', []):
    feature_id = feature.get('id')
    if feature_id in selected_ids:
        if feature.get('geometry', {}).get('type') == 'Point':
            selected_points.append(feature)

# Move selected points 100km North
for point in selected_points:
    point['geometry']['coordinates'][1] += 100 / 111.32  # 100km ≈ 0.9 degrees latitude

# Update plot and show result
if selected_points:
    client.update_features(selected_points, "sample.plot.json")
    print(f"{len(selected_points)} points moved 100km North")
else:
    print("No point features selected")