#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North
"""

from debrief_api import debrief

# Get selected point features and move them 100km North
selected = debrief.get_selected_features("sample.plot.json")
points = [f for f in selected if f.get('geometry', {}).get('type') == 'Point']

for point in points:
    point['geometry']['coordinates'][1] += 100 / 111.32  # 100km ≈ 0.9 degrees latitude

# Update plot and show result
if points:
    debrief.update_features("sample.plot.json", points)
    print(f"{len(points)} points moved 100km North")
else:
    print("No point features selected")