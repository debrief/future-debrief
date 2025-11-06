#!/usr/bin/env python3
"""
Simple example: Toggle Paris point color between green and red

This example demonstrates proper type narrowing when working with
Pydantic union types for type-safe feature manipulation.
"""

from mcp_client import MCPClient
from debrief.types.features.point import DebriefPointFeature

# Create MCP client
client = MCPClient()

# Get the feature collection (returns DebriefFeatureCollection model)
feature_collection = client.get_features()

# Find Paris point and update its color
updates = []
for feature in feature_collection.features:
    # Type narrowing: Check if this is specifically a DebriefPointFeature
    # This narrows the union type and gives us proper type checking
    if isinstance(feature, DebriefPointFeature):
        # Now Pylance knows feature.id is str | int | None
        # Type narrow again: ensure id is a string before calling .lower()
        if isinstance(feature.id, str) and 'paris' in feature.id.lower():
            # feature.properties is now PointProperties (not a union)
            # Check that properties exist
            if feature.properties:
                current_color = feature.properties.marker_color or ''

                # Toggle between green and red
                if current_color == '#00FF00':  # If already green
                    feature.properties.marker_color = '#FF0000'  # Change to red
                    print(f"Changing {feature.id} to red")
                else:
                    feature.properties.marker_color = '#00FF00'  # Change to green
                    print(f"Changing {feature.id} to green")

                updates.append(feature)

# Update features (accepts List[DebriefFeature])
if updates:
    client.update_features(updates)
    print(f"✓ Updated {len(updates)} feature(s)")
else:
    print("No Paris point found")
