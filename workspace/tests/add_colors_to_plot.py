#!/usr/bin/env python3
"""
Utility to add colors to existing plot points.

This script demonstrates how to programmatically add color properties to 
point features in a plot for the new colored circle marker rendering.
"""

from debrief_api import debrief
import random


def get_random_color():
    """Generate a random hex color."""
    colors = [
        '#FF0000',  # Red
        '#00FF00',  # Green  
        '#0000FF',  # Blue
        '#FFFF00',  # Yellow
        '#FF00FF',  # Magenta
        '#00FFFF',  # Cyan
        '#FFA500',  # Orange
        '#800080',  # Purple
        '#FF6B35',  # Orange-red
        '#32CD32',  # Lime green
        '#FF1493',  # Deep pink
        '#1E90FF',  # Dodger blue
        '#FFD700',  # Gold
        '#DC143C',  # Crimson
        '#00CED1',  # Dark turquoise
        '#8A2BE2',  # Blue violet
        '#228B22',  # Forest green
        '#FF4500',  # Orange red
    ]
    return random.choice(colors)


def add_colors_to_points():
    """Add random colors to all point features in the current plot."""
    print("=" * 60)
    print("ADDING COLORS TO PLOT POINTS")
    print("=" * 60)
    
    try:
        debrief.connect()
        print("✓ Connected to Debrief WebSocket server")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Get current feature collection
    print("\n1. Getting current feature collection...")
    try:
        fc = debrief.get_feature_collection()
        print(f"✓ Retrieved feature collection with {len(fc.get('features', []))} features")
    except Exception as e:
        print(f"✗ Failed to get feature collection: {e}")
        return
    
    if not fc.get('features'):
        print("⚠️  No features found in the plot")
        return
    
    # Find point features and add colors
    print("\n2. Adding colors to point features...")
    point_features = []
    modified_count = 0
    
    for feature in fc['features']:
        if (feature.get('geometry', {}).get('type') == 'Point'):
            # Check if it already has a color
            if not feature.get('properties', {}).get('color'):
                # Add a random color
                if not feature.get('properties'):
                    feature['properties'] = {}
                
                color = get_random_color()
                feature['properties']['color'] = color
                modified_count += 1
                
                name = feature['properties'].get('name', f'Point at {feature["geometry"]["coordinates"]}')
                print(f"   • Added color {color} to: {name}")
            else:
                existing_color = feature['properties']['color']
                name = feature['properties'].get('name', f'Point at {feature["geometry"]["coordinates"]}')
                print(f"   • Already has color {existing_color}: {name}")
            
            point_features.append(feature)
    
    if modified_count == 0:
        print("ℹ️  All point features already have colors assigned")
        return
    
    # Update the feature collection
    print(f"\n3. Updating plot with {modified_count} newly colored points...")
    try:
        debrief.set_feature_collection(fc)
        print("✓ Plot updated successfully")
        
        debrief.notify(f"🎨 Added colors to {modified_count} point features!")
        
    except Exception as e:
        print(f"✗ Failed to update plot: {e}")
        return
    
    # Display summary
    print(f"\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"• Total features: {len(fc['features'])}")
    print(f"• Point features: {len(point_features)}")
    print(f"• Colors added: {modified_count}")
    print("\n🎨 Your point features now have colorful circle markers!")
    print("   Each point will render as a colored circle based on its properties.color value.")
    print("=" * 60)


def add_specific_colors_to_selection():
    """Add specific colors to currently selected features."""
    print("=" * 60)
    print("ADDING COLORS TO SELECTED FEATURES")
    print("=" * 60)
    
    try:
        debrief.connect()
        print("✓ Connected to Debrief WebSocket server")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Get selected features
    print("\n1. Getting selected features...")
    try:
        selected = debrief.get_selected_features()
        if not selected:
            print("⚠️  No features are currently selected")
            print("   Please select some point features in VS Code and run this again")
            return
        
        print(f"✓ Found {len(selected)} selected features")
    except Exception as e:
        print(f"✗ Failed to get selected features: {e}")
        return
    
    # Filter for point features and add colors
    modified_features = []
    for feature in selected:
        if feature.get('geometry', {}).get('type') == 'Point':
            # Prompt user for color
            name = feature.get('properties', {}).get('name', 'Unnamed point')
            current_color = feature.get('properties', {}).get('color', 'None')
            
            print(f"\n• Feature: {name}")
            print(f"  Current color: {current_color}")
            
            new_color = input("  Enter new color (hex format like #FF0000, or press Enter to skip): ").strip()
            
            if new_color and new_color.startswith('#') and len(new_color) == 7:
                if not feature.get('properties'):
                    feature['properties'] = {}
                feature['properties']['color'] = new_color
                modified_features.append(feature)
                print(f"  ✓ Color set to {new_color}")
            elif new_color:
                print(f"  ⚠️  Invalid color format: {new_color} (expected #RRGGBB)")
            else:
                print("  • Skipped")
    
    if not modified_features:
        print("\n⚠️  No features were modified")
        return
    
    # Update the modified features
    print(f"\n2. Updating {len(modified_features)} features...")
    try:
        debrief.update_features(modified_features)
        print("✓ Features updated successfully")
        
        debrief.notify(f"🎨 Updated colors for {len(modified_features)} selected features!")
        
    except Exception as e:
        print(f"✗ Failed to update features: {e}")


def main():
    """Main function - offer different options."""
    print("Choose an option:")
    print("1. Add random colors to all points without colors")
    print("2. Add specific colors to selected features (interactive)")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == '1':
        add_colors_to_points()
    elif choice == '2':
        add_specific_colors_to_selection()
    else:
        print("Invalid choice. Please run again and select 1 or 2.")


if __name__ == "__main__":
    main()