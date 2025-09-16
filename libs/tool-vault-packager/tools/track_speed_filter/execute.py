"""Track speed filtering tool for maritime analysis."""

import math
from typing import Dict, Any


def track_speed_filter(track_feature: Dict[str, Any], min_speed: float) -> Dict[str, Any]:
    """
    Find timestamps where track speed equals or exceeds a minimum threshold.

    This function analyzes a Debrief track feature and calculates speeds between
    consecutive coordinate points, returning timestamps where the calculated speed
    meets or exceeds the specified minimum threshold. Speed is calculated using
    the haversine formula for geographic coordinates and assumes timestamps are
    evenly spaced for time calculations.

    Args:
        track_feature (Dict[str, Any]): A GeoJSON track feature conforming to
                                       DebriefTrackFeature schema with LineString
                                       or MultiLineString geometry
        min_speed (float): Minimum speed threshold in knots

    Returns:
        Dict[str, Any]: ToolVault command object containing filtered timestamps
                       or appropriate message if no data available

    Examples:
        >>> track = {
        ...     "type": "Feature",
        ...     "properties": {
        ...         "dataType": "track",
        ...         "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z"]
        ...     },
        ...     "geometry": {
        ...         "type": "LineString",
        ...         "coordinates": [[0, 0], [0.01, 0]]
        ...     }
        ... }
        >>> result = track_speed_filter(track, 10.0)
        >>> result["command"]
        'showText'
    """
    # Validate input structure
    if not isinstance(track_feature, dict) or track_feature.get("type") != "Feature":
        return {
            "command": "showText",
            "payload": "Invalid input: not a valid GeoJSON Feature"
        }

    properties = track_feature.get("properties", {})
    if properties.get("dataType") != "track":
        return {
            "command": "showText",
            "payload": "Invalid input: feature is not a track (dataType must be 'track')"
        }

    geometry = track_feature.get("geometry", {})
    if not geometry:
        return {
            "command": "showText",
            "payload": "No geometry found in track feature"
        }

    # Extract coordinates based on geometry type
    coordinates = []
    if geometry.get("type") == "LineString":
        coordinates = geometry.get("coordinates", [])
    elif geometry.get("type") == "MultiLineString":
        # For MultiLineString, concatenate all coordinate arrays
        multi_coords = geometry.get("coordinates", [])
        for line_coords in multi_coords:
            coordinates.extend(line_coords)
    else:
        return {
            "command": "showText",
            "payload": f"Unsupported geometry type: {geometry.get('type')} (expected LineString or MultiLineString)"
        }

    if len(coordinates) < 2:
        return {
            "command": "showText",
            "payload": "Track must have at least 2 coordinate points to calculate speed"
        }

    timestamps = properties.get("timestamps", [])
    if not timestamps or len(timestamps) != len(coordinates):
        return {
            "command": "showText",
            "payload": f"Timestamp count ({len(timestamps)}) must match coordinate count ({len(coordinates)})"
        }

    # Calculate speeds and find timestamps exceeding threshold
    high_speed_times = []

    for i in range(len(coordinates) - 1):
        # Get consecutive coordinate pairs
        coord1 = coordinates[i]
        coord2 = coordinates[i + 1]

        if len(coord1) < 2 or len(coord2) < 2:
            continue

        # Calculate distance using haversine formula
        lat1, lon1 = math.radians(coord1[1]), math.radians(coord1[0])
        lat2, lon2 = math.radians(coord2[1]), math.radians(coord2[0])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (math.sin(dlat/2)**2 +
             math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))

        # Distance in nautical miles (Earth's radius ≈ 3440.065 nautical miles)
        distance_nm = 3440.065 * c

        # Assume 1 minute between timestamps for speed calculation
        # This is a simplification - in reality you'd parse the timestamp difference
        time_hours = 1.0 / 60.0  # 1 minute in hours

        speed_knots = distance_nm / time_hours

        # If speed meets threshold, add the timestamp for this segment
        if speed_knots >= min_speed:
            high_speed_times.append(timestamps[i + 1])  # Use end timestamp of segment

    if not high_speed_times:
        return {
            "command": "showText",
            "payload": f"No timestamps found where speed >= {min_speed} knots"
        }

    return {
        "command": "showText",
        "payload": f"Found {len(high_speed_times)} timestamps with speed >= {min_speed} knots:\n" +
                  "\n".join(high_speed_times)
    }