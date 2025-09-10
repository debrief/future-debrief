#!/usr/bin/env python3
"""
Simple example: Move selected points 100km North
"""

from debrief_api import debrief

# Import SelectionState for typed API
import sys
import os
shared_types_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../libs/shared-types/derived/python'))
sys.path.insert(0, shared_types_path)
exec(open(os.path.join(shared_types_path, 'SelectionState.py')).read())

# Get selected features using SelectionState
selection_state = debrief.get_selected_features("sample.plot.json")
print(f"Selected feature IDs: {selection_state.selected_ids}")

# Get the full feature collection to access selected features
fc = debrief.get_feature_collection("sample.plot.json")
selected_points = []

# Find selected point features
for feature in fc.get('features', []):
    feature_id = feature.get('id')
    if feature_id in selection_state.selected_ids:
        if feature.get('geometry', {}).get('type') == 'Point':
            selected_points.append(feature)

# Move selected points 100km North
for point in selected_points:
    point['geometry']['coordinates'][1] += 100 / 111.32  # 100km ≈ 0.9 degrees latitude

# Update plot and show result
if selected_points:
    debrief.update_features(selected_points, "sample.plot.json")
    print(f"{len(selected_points)} points moved 100km North")
else:
    print("No point features selected")