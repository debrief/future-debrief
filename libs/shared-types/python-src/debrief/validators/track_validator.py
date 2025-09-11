"""
Manual validators for Track features
These validators work with the generated types and provide additional validation logic
"""

from typing import Any, Dict, List, Union
from datetime import datetime

try:
    from ..types.track import TrackFeature
except ImportError:
    # If import fails, define a minimal type for validation
    class TrackFeature:  # type: ignore
        pass


def validate_timestamps_length(feature: Dict[str, Any]) -> bool:
    """
    Validates that timestamps array length matches coordinate points count
    This is the critical cross-field validation not covered by JSON Schema
    """
    properties = feature.get("properties", {})
    timestamps = properties.get("timestamps")

    if not timestamps:
        return True  # timestamps are optional

    geometry = feature.get("geometry", {})
    coordinates = geometry.get("coordinates", [])
    geometry_type = geometry.get("type")

    # Handle LineString geometry
    if geometry_type == "LineString":
        return len(timestamps) == len(coordinates)

    # Handle MultiLineString geometry
    if geometry_type == "MultiLineString":
        # Calculate total points across all LineStrings
        total_points = sum(len(line_string) for line_string in coordinates)
        return len(timestamps) == total_points

    return False


def validate_track_feature(feature: Any) -> bool:
    """
    Validates that track feature has required properties and valid structure
    """
    if not isinstance(feature, dict):
        return False

    # Check basic GeoJSON structure
    if feature.get("type") != "Feature":
        return False

    feature_id = feature.get("id")
    if feature_id is None:
        return False  # id is required

    # Check geometry
    geometry = feature.get("geometry")
    if not isinstance(geometry, dict):
        return False

    valid_geometry_types = ["LineString", "MultiLineString"]
    if geometry.get("type") not in valid_geometry_types:
        return False

    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list):
        return False

    # Check properties
    properties = feature.get("properties")
    if not isinstance(properties, dict):
        return False

    # Validate timestamps if present
    timestamps = properties.get("timestamps")
    if timestamps is not None:
        if not isinstance(timestamps, list):
            return False

        # Check each timestamp is valid
        for timestamp in timestamps:
            if isinstance(timestamp, str):
                try:
                    datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except ValueError:
                    return False
            elif not isinstance(timestamp, datetime):
                return False

        # Apply timestamps length validation
        if not validate_timestamps_length(feature):
            return False

    return True


def validate_linestring_coordinates(coordinates: Any) -> bool:
    """
    Validates coordinate structure for LineString
    """
    if not isinstance(coordinates, list):
        return False

    if len(coordinates) < 2:
        return False  # LineString must have at least 2 points

    for coord in coordinates:
        if not isinstance(coord, list):
            return False
        if len(coord) < 2 or len(coord) > 3:
            return False
        if not all(isinstance(val, (int, float)) for val in coord):
            return False

    return True


def validate_multilinestring_coordinates(coordinates: Any) -> bool:
    """
    Validates coordinate structure for MultiLineString
    """
    if not isinstance(coordinates, list):
        return False

    if len(coordinates) < 1:
        return False  # MultiLineString must have at least 1 LineString

    return all(validate_linestring_coordinates(line_string) for line_string in coordinates)


def validate_track_feature_comprehensive(feature: Any) -> Dict[str, Union[bool, List[str]]]:
    """
    Comprehensive track feature validation
    """
    errors = []

    # Basic structure checks (without timestamp validation)
    if not isinstance(feature, dict):
        errors.append("Feature must be a dictionary")
        return {"is_valid": False, "errors": errors}

    if feature.get("type") != "Feature":
        errors.append('Feature type must be "Feature"')

    if feature.get("id") is None:
        errors.append("Feature must have an id")

    geometry = feature.get("geometry")
    if not isinstance(geometry, dict):
        errors.append("Feature must have a geometry object")
    else:
        geometry_type = geometry.get("type")
        if geometry_type not in ["LineString", "MultiLineString"]:
            errors.append("Track geometry must be LineString or MultiLineString")

        coordinates = geometry.get("coordinates", [])
        if not isinstance(coordinates, list):
            errors.append("Geometry must have coordinates array")
        else:
            # Detailed coordinate validation
            if geometry_type == "LineString":
                if not validate_linestring_coordinates(coordinates):
                    errors.append("Invalid LineString coordinates")
            elif geometry_type == "MultiLineString":
                if not validate_multilinestring_coordinates(coordinates):
                    errors.append("Invalid MultiLineString coordinates")

    properties = feature.get("properties")
    if not isinstance(properties, dict):
        errors.append("Feature must have a properties object")

    # Timestamps validation - check this regardless of other errors
    if not validate_timestamps_length(feature):
        errors.append("Timestamps array length does not match coordinate points count")

    return {"is_valid": len(errors) == 0, "errors": errors}


def is_valid_datetime_string(date_str: str) -> bool:
    """
    Validates that string is a valid ISO datetime
    """
    try:
        datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return True
    except (ValueError, TypeError):
        return False
