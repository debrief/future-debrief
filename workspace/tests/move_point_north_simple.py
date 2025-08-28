#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North
"""

from debrief_api import get_selected_features, update_features

# Get selected features
selected = get_selected_features("sample.plot.json")
moved_count = 0

# Move each point feature 100km North
for feature in selected:
    if feature.get('geometry', {}).get('type') == 'Point':
        coords = feature['geometry']['coordinates']
        coords[1] += 100 / 111.32  # Move North: 100km ≈ 0.9 degrees latitude
        moved_count += 1

# Update the plot if we moved any points
if moved_count > 0:
    update_features("sample.plot.json", [f for f in selected if f.get('geometry', {}).get('type') == 'Point'])
    print(f"{moved_count} points successfully moved 100km North")
else:
    print("No point features selected")