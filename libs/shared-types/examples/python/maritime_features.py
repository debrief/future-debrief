#!/usr/bin/env python3
"""
Python Usage Examples for Future Debrief Maritime Features

This file demonstrates how to use the generated Pydantic models
from the JSON schemas for maritime data validation and manipulation.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import ValidationError

# Import generated Pydantic models (these would be available after build)
try:
    from debrief.types.features.track import DebriefTrackFeature
    from debrief.types.features.point import DebriefPointFeature
    from debrief.types.features.annotation import DebriefAnnotationFeature
    from debrief.types.features.debrief_feature_collection import DebriefFeatureCollection
except ImportError:
    print("⚠️ Pydantic models not available. Run 'pnpm generate:types' first.")
    # For demo purposes, we'll use dict structures
    DebriefTrackFeature = dict
    DebriefPointFeature = dict
    DebriefAnnotationFeature = dict
    DebriefFeatureCollection = dict


def create_vessel_track() -> dict:
    """
    Example 1: Creating a maritime vessel track
    """
    track = {
        "type": "Feature",
        "dataType": "track",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-0.1276, 51.5074, 0],    # London (lon, lat, depth)
                [-74.0060, 40.7128, 0],   # New York
                [-122.4194, 37.7749, 0]  # San Francisco
            ]
        },
        "properties": {
            "name": "Vessel Alpha",
            "platform": "Merchant Vessel",
            "timestamps": [
                "2024-09-24T08:00:00Z",
                "2024-09-24T14:00:00Z",
                "2024-09-24T20:00:00Z"
            ],
            "course": [90, 270, 315],
            "speed": [12.5, 18.3, 15.2],
            "classification": "Friendly",
            "color": "#00FF00"
        }
    }

    # With Pydantic models, validation happens automatically:
    try:
        if DebriefTrackFeature != dict:
            validated_track = DebriefTrackFeature(**track)
            print("✅ Track validation successful")
            return validated_track.dict()
        return track
    except ValidationError as e:
        print(f"❌ Track validation failed: {e}")
        return track


def create_point_of_interest() -> dict:
    """
    Example 2: Creating a point of interest
    """
    point = {
        "type": "Feature",
        "dataType": "point",
        "geometry": {
            "type": "Point",
            "coordinates": [-0.1276, 51.5074, 0]  # London
        },
        "properties": {
            "name": "Port of London",
            "platform": "Port Authority",
            "timestamp": "2024-09-24T12:00:00Z",
            "classification": "Neutral",
            "color": "#0000FF"
        }
    }

    try:
        if DebriefPointFeature != dict:
            validated_point = DebriefPointFeature(**point)
            print("✅ Point validation successful")
            return validated_point.dict()
        return point
    except ValidationError as e:
        print(f"❌ Point validation failed: {e}")
        return point


def create_annotation() -> dict:
    """
    Example 3: Creating an annotation
    """
    annotation = {
        "type": "Feature",
        "dataType": "annotation",
        "geometry": {
            "type": "Point",
            "coordinates": [-74.0060, 40.7128, 0]  # New York
        },
        "properties": {
            "name": "Critical Event",
            "text": "Vessel Alpha entered territorial waters",
            "timestamp": "2024-09-24T14:30:00Z",
            "color": "#FF0000",
            "classification": "Important"
        }
    }

    try:
        if DebriefAnnotationFeature != dict:
            validated_annotation = DebriefAnnotationFeature(**annotation)
            print("✅ Annotation validation successful")
            return validated_annotation.dict()
        return annotation
    except ValidationError as e:
        print(f"❌ Annotation validation failed: {e}")
        return annotation


def create_maritime_scenario() -> dict:
    """
    Example 4: Creating a complete maritime feature collection
    """
    feature_collection = {
        "type": "FeatureCollection",
        "dataType": "debrief",
        "features": [
            create_vessel_track(),
            create_point_of_interest(),
            create_annotation()
        ]
    }

    try:
        if DebriefFeatureCollection != dict:
            validated_collection = DebriefFeatureCollection(**feature_collection)
            print("✅ Feature collection validation successful")
            return validated_collection.dict()
        return feature_collection
    except ValidationError as e:
        print(f"❌ Feature collection validation failed: {e}")
        return feature_collection


def validate_maritime_data() -> bool:
    """
    Example 5: Validating maritime data with comprehensive checks
    """
    scenario = create_maritime_scenario()

    try:
        # Basic structure validation
        assert scenario["type"] == "FeatureCollection"
        assert scenario["dataType"] == "debrief"
        assert len(scenario["features"]) > 0

        print("✅ Maritime scenario structure is valid")
        print(f"Features: {len(scenario['features'])}")

        # Validate each feature
        for i, feature in enumerate(scenario["features"]):
            data_type = feature.get("dataType")
            name = feature.get("properties", {}).get("name", f"Feature {i}")
            print(f"  {i+1}. {name} ({data_type})")

            # Check coordinates
            geometry = feature.get("geometry", {})
            coordinates = geometry.get("coordinates", [])

            if data_type == "track":
                # Track should have multiple coordinates
                if len(coordinates) < 2:
                    print(f"    ⚠️ Track has insufficient coordinates: {len(coordinates)}")
                else:
                    print(f"    ✅ Track has {len(coordinates)} waypoints")

                # Check timestamp alignment
                timestamps = feature.get("properties", {}).get("timestamps", [])
                if len(timestamps) != len(coordinates):
                    print(f"    ⚠️ Timestamp/coordinate mismatch: {len(timestamps)} vs {len(coordinates)}")
                else:
                    print(f"    ✅ Timestamps aligned with coordinates")

            elif data_type in ["point", "annotation"]:
                # Points should have single coordinate
                if len(coordinates) != 3:  # [lon, lat, depth]
                    print(f"    ⚠️ Invalid coordinate format for {data_type}")
                else:
                    lon, lat, depth = coordinates
                    print(f"    ✅ {data_type.title()} at [{lon}, {lat}] {depth}m")

        return True

    except Exception as error:
        print(f"❌ Validation error: {error}")
        return False


def analyze_maritime_timestamps_and_coordinates(track: dict) -> None:
    """
    Example 6: Working with timestamps and coordinates
    """
    coordinates = track["geometry"]["coordinates"]
    properties = track["properties"]
    timestamps = properties.get("timestamps", [])
    course = properties.get("course", [])
    speed = properties.get("speed", [])

    print(f"\nTrack Analysis for: {properties['name']}")
    print(f"Total waypoints: {len(coordinates)}")

    # Validate timestamps match coordinates
    if len(timestamps) == len(coordinates):
        print("✅ Timestamps match coordinate count")

        for index, coord in enumerate(coordinates):
            lon, lat, depth = coord[0], coord[1], coord[2] if len(coord) > 2 else 0
            timestamp = timestamps[index] if index < len(timestamps) else 'N/A'
            heading = course[index] if index < len(course) else 'N/A'
            velocity = speed[index] if index < len(speed) else 'N/A'

            print(f"  {index + 1}: {timestamp} - [{lon}, {lat}] {depth}m - {heading}° @ {velocity}kts")
    else:
        print("⚠️ Timestamp and coordinate count mismatch")


def convert_to_geojson(maritime_data: dict) -> str:
    """
    Example 7: Converting to standard GeoJSON for interoperability
    """
    # Remove Debrief-specific properties that aren't standard GeoJSON
    geojson_data = maritime_data.copy()

    # Standard GeoJSON doesn't have dataType at the collection level
    if "dataType" in geojson_data:
        # Move to properties or remove
        del geojson_data["dataType"]

    # Process features
    for feature in geojson_data.get("features", []):
        if "dataType" in feature:
            # Move dataType to properties for standard GeoJSON compatibility
            if "properties" not in feature:
                feature["properties"] = {}
            feature["properties"]["dataType"] = feature["dataType"]
            del feature["dataType"]

    return json.dumps(geojson_data, indent=2)


def load_from_json_file(filepath: str) -> Optional[dict]:
    """
    Example 8: Loading maritime data from JSON file
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Validate using Pydantic if available
        if DebriefFeatureCollection != dict:
            validated_data = DebriefFeatureCollection(**data)
            print(f"✅ Loaded and validated data from {filepath}")
            return validated_data.dict()
        else:
            print(f"📄 Loaded data from {filepath} (validation skipped)")
            return data

    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {filepath}: {e}")
        return None
    except ValidationError as e:
        print(f"❌ Validation failed for {filepath}: {e}")
        return None


if __name__ == "__main__":
    print("🚢 Future Debrief Maritime Python Examples")
    print("=" * 50)

    # Create and validate maritime scenario
    scenario = create_maritime_scenario()
    print("\n📊 Created maritime scenario:")
    print(json.dumps(scenario, indent=2))

    # Validate data
    print("\n🔍 Validating maritime data:")
    validate_maritime_data()

    # Analyze track details
    track = create_vessel_track()
    analyze_maritime_timestamps_and_coordinates(track)

    # Convert to standard GeoJSON
    print("\n🌍 Standard GeoJSON format:")
    geojson_output = convert_to_geojson(scenario)
    print(geojson_output[:300] + "..." if len(geojson_output) > 300 else geojson_output)

    print("\n✅ Examples completed successfully!")