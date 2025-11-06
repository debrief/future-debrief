#!/usr/bin/env python3
"""
Simple example: Toggle Paris point color between green and red

This example demonstrates how to use Pydantic types with the MCP client
for type-safe feature manipulation.
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
    # Check if this is a point feature with Paris in the ID
    if feature.id and 'paris' in feature.id.lower():
        # Type-safe access to properties (Pydantic model)
        if hasattr(feature, 'properties') and hasattr(feature.properties, 'color'):
            current_color = feature.properties.color

            # Toggle between green and red
            if current_color == '#00FF00':  # If already green
                feature.properties.color = '#FF0000'  # Change to red
                print(f"Changing {feature.id} to red")
            else:
                feature.properties.color = '#00FF00'  # Change to green
                print(f"Changing {feature.id} to green")

            updates.append(feature)

# Update features (accepts List[DebriefFeature])
if updates:
    client.update_features(updates)
    print(f"✓ Updated {len(updates)} feature(s)")
else:
    print("No Paris point found")
