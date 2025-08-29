#!/usr/bin/env python3
"""
Simple example: Color the Paris point green
"""

from debrief_api import debrief

# Get the feature collection and find Paris point
fc = debrief.get_feature_collection()
features = fc.get('features', [])

# Find point with ID starting with "paris"
paris_feature = None
for feature in features:
    if feature.get('id', '').lower().startswith('paris'):
        paris_feature = feature
        break

# Set color to green and update
if paris_feature:
    if not paris_feature.get('properties'):
        paris_feature['properties'] = {}
    
    paris_feature['properties']['color'] = '#00FF00'  # Green
    
    debrief.update_features([paris_feature])
    print(f"Set {paris_feature.get('id')} color to green")
else:
    print("No point with ID starting with 'paris' found")