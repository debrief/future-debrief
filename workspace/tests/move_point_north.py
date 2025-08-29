#!/usr/bin/env python3
"""
Debrief WebSocket API Demonstrator - Move Point North

This script demonstrates practical usage of the Debrief WebSocket API by:
1. Getting the currently selected features from sample.plot.json
2. Finding point features among the selection
3. Moving point features 100km North
4. Updating the plot with the modified features

Usage:
1. Open sample.plot.json in VS Code
2. Select one or more point features in the plot viewer
3. Run this script: python move_point_north.py
"""

import math
from typing import List, Dict, Any, Tuple

from debrief_api import debrief, DebriefAPIError


def move_point_north(coordinates: List[float], distance_km: float = 100.0) -> List[float]:
    """
    Move a point coordinate North by the specified distance.
    
    Args:
        coordinates: [longitude, latitude] in decimal degrees
        distance_km: Distance to move North in kilometers
        
    Returns:
        New [longitude, latitude] coordinates
    """
    if len(coordinates) != 2:
        raise ValueError("Coordinates must be [longitude, latitude]")
    
    lon, lat = coordinates
    
    # Earth's radius in kilometers
    EARTH_RADIUS_KM = 6371.0
    
    # Convert distance to degrees latitude
    # 1 degree latitude ≈ 111.32 km
    lat_offset_deg = distance_km / 111.32
    
    # Calculate new latitude
    new_lat = lat + lat_offset_deg
    
    # Longitude stays the same when moving due North
    new_lon = lon
    
    # Clamp latitude to valid range
    new_lat = max(-90.0, min(90.0, new_lat))
    
    return [new_lon, new_lat]


def format_coordinates(coords: List[float]) -> str:
    """Format coordinates for display."""
    return f"{coords[1]:.6f}°N, {coords[0]:.6f}°{'E' if coords[0] >= 0 else 'W'}"


def calculate_distance_km(coord1: List[float], coord2: List[float]) -> float:
    """
    Calculate the distance between two coordinates using the Haversine formula.
    
    Args:
        coord1: [longitude, latitude] of first point
        coord2: [longitude, latitude] of second point
        
    Returns:
        Distance in kilometers
    """
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth's radius in kilometers
    return 6371.0 * c


def move_selected_points_north():
    """
    Main function: Move selected point features 100km North.
    """
    filename = "sample.plot.json"
    distance_km = 100.0
    
    try:
        # Get currently selected features
        debrief.notify("Getting selected features...")
        selected_features = debrief.get_selected_features(filename)
        
        if not selected_features:
            debrief.notify("❌ No features selected. Please select one or more point features in the plot viewer.")
            print("No features selected. Please select features in VS Code and try again.")
            return
        
        print(f"Found {len(selected_features)} selected feature(s)")
        
        # Find point features and prepare modifications
        points_to_move = []
        modified_features = []
        
        for feature in selected_features:
            geometry = feature.get('geometry', {})
            geometry_type = geometry.get('type')
            
            if geometry_type == 'Point':
                coordinates = geometry.get('coordinates')
                if coordinates and len(coordinates) >= 2:
                    points_to_move.append(feature)
                    
                    # Create modified feature
                    modified_feature = feature.copy()
                    old_coords = coordinates[:2]  # Take only lon, lat (ignore altitude if present)
                    new_coords = move_point_north(old_coords, distance_km)
                    
                    # Preserve altitude if present
                    if len(coordinates) > 2:
                        new_coords.append(coordinates[2])
                    
                    modified_feature['geometry']['coordinates'] = new_coords
                    
                    # Update properties to reflect the change
                    if not modified_feature.get('properties'):
                        modified_feature['properties'] = {}
                    
                    modified_feature['properties']['moved_north_km'] = distance_km
                    modified_feature['properties']['original_position'] = format_coordinates(old_coords)
                    modified_feature['properties']['new_position'] = format_coordinates(new_coords)
                    
                    # Calculate actual distance moved
                    actual_distance = calculate_distance_km(old_coords, new_coords)
                    modified_feature['properties']['actual_distance_km'] = round(actual_distance, 2)
                    
                    modified_features.append(modified_feature)
                    
                    # Print movement details
                    feature_name = feature.get('properties', {}).get('name', 'Unnamed')
                    print(f"Moving '{feature_name}':")
                    print(f"  From: {format_coordinates(old_coords)}")
                    print(f"  To:   {format_coordinates(new_coords)}")
                    print(f"  Distance: {actual_distance:.2f} km")
                else:
                    print(f"Warning: Point feature has invalid coordinates: {coordinates}")
            else:
                feature_name = feature.get('properties', {}).get('name', 'Unnamed')
                print(f"Skipping '{feature_name}' (type: {geometry_type}) - only Point features are supported")
        
        if not points_to_move:
            debrief.notify("❌ No point features found in selection. Please select point features.")
            print("No point features found in the selection.")
            return
        
        # Update the features in the plot
        print(f"\nUpdating {len(modified_features)} point feature(s) in the plot...")
        debrief.update_features(filename, modified_features)
        
        # Re-select the moved features to keep them highlighted
        moved_feature_ids = [f.get('properties', {}).get('id') for f in modified_features if f.get('properties', {}).get('id')]
        if moved_feature_ids:
            debrief.set_selected_features(filename, moved_feature_ids)
        
        # Success notification
        success_message = f"✅ Moved {len(modified_features)} point feature(s) {distance_km}km North!"
        debrief.notify(success_message)
        print(f"\nSuccess! {success_message}")
        
        # Print summary
        print("\nSummary:")
        for feature in modified_features:
            props = feature.get('properties', {})
            name = props.get('name', 'Unnamed')
            actual_distance = props.get('actual_distance_km', 0)
            print(f"  • {name}: moved {actual_distance}km North")
        
    except DebriefAPIError as e:
        error_msg = f"API Error: {e}"
        if e.code:
            error_msg += f" (Code: {e.code})"
        
        debrief.notify(f"❌ {error_msg}")
        print(error_msg)
        
        # Provide helpful suggestions based on error code
        if e.code == 404:
            print("Make sure sample.plot.json is open in VS Code workspace.")
        elif e.code == 400:
            print("Check that the selected features have valid data.")
    
    except Exception as e:
        error_msg = f"Unexpected error: {e}"
        debrief.notify(f"❌ {error_msg}")
        print(error_msg)


def main():
    """
    Entry point for the script.
    """
    print("=" * 60)
    print("DEBRIEF WEBSOCKET API DEMONSTRATOR")
    print("Move Selected Point Features 100km North")
    print("=" * 60)
    print()
    print("Instructions:")
    print("1. Make sure sample.plot.json is open in VS Code")
    print("2. Select one or more point features in the plot viewer")
    print("3. This script will move them 100km North")
    print()
    
    move_selected_points_north()
    
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()