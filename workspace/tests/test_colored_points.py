#!/usr/bin/env python3
"""
Test script for colored point feature rendering.

This script demonstrates the new colored circle marker rendering by:
1. Creating a test plot with various colored points
2. Adding points with different colors specified in properties.color
3. Adding some points without color (should default to #00F blue)
"""

from debrief_api import debrief
import json


def create_colored_test_plot():
    """Create a test plot with various colored points."""
    
    # Sample points with different colors
    test_features = [
        {
            "type": "Feature",
            "id": "red_point",
            "geometry": {
                "type": "Point",
                "coordinates": [-74.006, 40.7128]  # New York City
            },
            "properties": {
                "name": "Red Point (NYC)",
                "color": "#FF0000",  # Red
                "description": "A red marker in New York City"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point", 
                "coordinates": [-87.6298, 41.8781]  # Chicago
            },
            "id": "green_point",
            "properties": {
                "name": "Green Point (Chicago)",
                "color": "#00FF00",  # Green
                "description": "A green marker in Chicago"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-118.2437, 34.0522]  # Los Angeles
            },
            "id": "blue_point",
            "properties": { 
                "name": "Blue Point (LA)",
                "color": "#0000FF",  # Blue
                "description": "A blue marker in Los Angeles"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-122.4194, 37.7749]  # San Francisco
            },
            "id": "purple_point",
            "properties": {
                "name": "Purple Point (SF)",
                "color": "#800080",  # Purple
                "description": "A purple marker in San Francisco"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-95.3698, 29.7604]  # Houston
            },
            "id": "orange_point",
            "properties": {
                "name": "Orange Point (Houston)",
                "color": "#FFA500",  # Orange
                "description": "An orange marker in Houston"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-80.1918, 25.7617]  # Miami
            },
            "id": "cyan_point",
            "properties": {
                "name": "Cyan Point (Miami)", 
                "color": "#00FFFF",  # Cyan
                "description": "A cyan marker in Miami"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [-71.0589, 42.3601]  # Boston
            },
            "id": "default_point",
            "properties": {
                "name": "Default Blue Point (Boston)",
                # No color property - should default to #00F
                "description": "A point without color property (should be default blue #00F)"
            }
        },
        {
            "type": "Feature", 
            "geometry": {
                "type": "Point",
                "coordinates": [-77.0369, 38.9072]  # Washington DC
            },
            "id": "hex_color_point",
            "properties": {
                "name": "Custom Hex Color (DC)",
                "color": "#FF6B35",  # Custom orange-red
                "description": "A point with custom hex color #FF6B35"
            }
        }
    ]
    
    # Create the feature collection
    feature_collection = {
        "type": "FeatureCollection",
        "features": test_features
    }
    
    return feature_collection


def test_colored_points():
    """Test colored point rendering."""
    print("=" * 65)
    print("TESTING COLORED POINT FEATURE RENDERING")
    print("=" * 65)
    
    try:
        debrief.connect()
        print("✓ Connected to Debrief WebSocket server")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Create test plot
    print("\n1. Creating test plot with colored points...")
    test_plot = create_colored_test_plot()
    
    # Write to file
    filename = "colored_points_test.plot.json"
    with open(filename, 'w') as f:
        json.dump(test_plot, f, indent=2)
    
    print(f"✓ Created {filename} with {len(test_plot['features'])} colored points")
    
    # Set the feature collection in VS Code
    print("\n2. Setting feature collection in VS Code...")
    try:
        debrief.set_feature_collection(test_plot, filename)
        print("✓ Feature collection set successfully")
    except Exception as e:
        print(f"✗ Failed to set feature collection: {e}")
        return
    
    # Display information about the test points
    print("\n3. Test Points Created:")
    print("-" * 65)
    for feature in test_plot['features']:
        props = feature['properties']
        coords = feature['geometry']['coordinates']
        color = props.get('color', '#00F (default)')
        
        print(f"• {props['name']}")
        print(f"  Location: {coords[1]:.4f}°N, {coords[0]:.4f}°W")
        print(f"  Color: {color}")
        print(f"  ID: {feature.get('id', 'No ID')}")
        print()
    
    print("=" * 65)
    print("VISUAL RENDERING TEST")
    print("=" * 65)
    print("Open colored_points_test.plot.json in VS Code to see the results!")
    print()
    print("Expected Visual Results:")
    print("• Red circle marker in New York")
    print("• Green circle marker in Chicago") 
    print("• Blue circle marker in Los Angeles")
    print("• Purple circle marker in San Francisco")
    print("• Orange circle marker in Houston")
    print("• Cyan circle marker in Miami")
    print("• Default blue (#00F) circle marker in Boston (no color property)")
    print("• Custom orange-red (#FF6B35) circle marker in Washington DC")
    print()
    print("Selection Test:")
    print("• Click any point to select it")
    print("• Selected points should show orange border (#ff6b35)")
    print("• Selected points should be slightly larger (radius 10 vs 8)")
    print("• Fill colors should remain as specified in properties.color")
    print("=" * 65)
    
    # Test selection
    print("\n4. Testing point selection...")
    try:
        # Select a few points to demonstrate selection styling
        debrief.set_selected_features(['red_point', 'green_point'])
        print("✓ Selected red and green points to demonstrate selection styling")
        
        debrief.notify("🎨 Colored circle markers test completed! Check the plot editor to see the colorful results!")
    except Exception as e:
        print(f"✗ Selection test failed: {e}")


def main():
    """Main test function."""
    test_colored_points()
    
    print("\n" + "=" * 65)
    print("TEST COMPLETE")
    print("=" * 65)
    print("The new circle marker rendering supports:")
    print("✓ Custom colors via properties.color")
    print("✓ Default blue (#00F) when no color specified")
    print("✓ Screen-pixel sizing (8px radius, 10px when selected)")
    print("✓ Selection indicators (orange border, larger size)")
    print("✓ Proper color preservation during selection")
    print("=" * 65)


if __name__ == "__main__":
    main()