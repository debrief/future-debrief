#!/usr/bin/env python3
"""
Simple example: Toggle Paris point color between green and red
"""

from mcp_client import MCPClient

# Create MCP client
client = MCPClient()

# Get the feature collection and find Paris point
fc = client.get_features()
features = fc.get('features', [])
updates = []

for feature in features:
    if feature.get('id', '').lower().startswith('paris'):
        if feature.get('properties'):
            if feature['properties'].get('color', '') == '#00FF00':  # If already green
                feature['properties']['color'] = '#FF0000'  # Change to red
                print("Changing Paris to red")
            else:
                feature['properties']['color'] = '#00FF00'  # Change to green
                print("Changing Paris to green")
            updates.append(feature)

if updates:
    client.update_features(updates)
    print(f"✓ Updated {len(updates)} feature(s)")
else:
    print("No Paris point found")
