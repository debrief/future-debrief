#!/usr/bin/env python3
"""
Simple example: Color the Paris point green
"""

from debrief_api import debrief

# Get the feature collection and find Paris point
fc = debrief.get_feature_collection()
features = fc.get('features', [])

for feature in features:
    if feature.get('id', '').lower().startswith('paris'):
      if feature.get('properties'):
        if feature['properties'].get('color', '') == '#00FF00':  # If already green
            feature['properties']['color'] = '#FF0000'  # Change to red
        else:
            feature['properties']['color'] = '#00FF00'  # Change to green
        debrief.update_features([feature])
