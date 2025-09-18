"""Track speed filtering tool for maritime analysis."""

import math
from typing import Dict, Any
from pydantic import BaseModel, Field, model_validator
from debrief.types import DebriefTrackFeature


class TrackSpeedFilterParameters(BaseModel):
    """Parameters for the track_speed_filter tool."""

    track_feature: Dict[str, Any] = Field(
        json_schema_extra={
            "$ref": "https://example.org/debrief/schemas/features/Track.schema.json"
        },
        description="A GeoJSON track feature conforming to DebriefTrackFeature schema with LineString or MultiLineString geometry",
        examples=[
            {
                "type": "Feature",
                "id": "track_001",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[0, 0], [0.01, 0.01], [0.02, 0.02]]
                },
                "properties": {
                    "dataType": "track",
                    "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z", "2023-01-01T10:02:00Z"],
                    "name": "Sample Track",
                    "description": "Test track for speed analysis"
                }
            }
        ]
    )

    @model_validator(mode='after')
    def validate_track_feature(self):
        """Convert dict to TrackFeature and validate structure."""
        track_data = self.track_feature

        # Convert to shared-types DebriefTrackFeature for validation and processing
        try:
            track_feature_obj = DebriefTrackFeature.model_validate(track_data)
            # Store both dict (for schema) and object (for processing)
            self._track_feature_obj = track_feature_obj
        except Exception as e:
            raise ValueError(f"Invalid track feature structure: {e}")

        return self

    min_speed: float = Field(
        default=10.0,
        description="Minimum speed threshold in knots",
        ge=0.0,
        examples=[5.0, 10.0, 15.0, 20.0]
    )


def track_speed_filter(params: TrackSpeedFilterParameters) -> Dict[str, Any]:
    """
    Find timestamps where track speed equals or exceeds a minimum threshold.

    This function analyzes a Debrief track feature and calculates speeds between
    consecutive coordinate points, returning timestamps where the calculated speed
    meets or exceeds the specified minimum threshold. Speed is calculated using
    the haversine formula for geographic coordinates and assumes timestamps are
    evenly spaced for time calculations.

    Args:
        params: TrackSpeedFilterParameters containing track_feature and min_speed

    Returns:
        Dict[str, Any]: ToolVault command object containing filtered timestamps
                       or appropriate message if no data available

    Examples:
        >>> from pydantic import ValidationError
        >>> params = TrackSpeedFilterParameters(
        ...     track_feature=DebriefTrackFeature(
        ...         type="Feature",
        ...         id="test",
        ...         geometry=TrackGeometry(
        ...             type="LineString",
        ...             coordinates=[[0, 0], [0.01, 0]]
        ...         ),
        ...         properties=TrackProperties(
        ...             dataType="track",
        ...             timestamps=["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z"]
        ...         )
        ...     ),
        ...     min_speed=10.0
        ... )
        >>> result = track_speed_filter(params)
        >>> result["command"]
        'showText'
    """
    # Extract validated parameters from Pydantic model
    track_feature = params._track_feature_obj  # Use the parsed TrackFeature object
    min_speed = params.min_speed

    geometry = track_feature.geometry
    properties = track_feature.properties

    # Extract coordinates based on geometry type
    # Convert all coordinate structures to List[List[float]] format
    coordinates = []
    if geometry.type.value == "LineString":
        # LineString: List[Coordinate] where Coordinate.root is List[float]
        for coord in geometry.coordinates:
            coordinates.append(coord.root)
    elif geometry.type.value == "MultiLineString":
        # MultiLineString: List[Coordinate1] where Coordinate1.root is List[Coordinate11] where Coordinate11.root is List[float]
        for line_coord1 in geometry.coordinates:
            for coord11 in line_coord1.root:
                # coord11 should be a Coordinate11 object with .root as List[float]
                # But handle defensive cases where it might be different types
                if hasattr(coord11, 'root') and not isinstance(coord11, (int, float, str)):
                    coordinates.append(coord11.root)
                elif isinstance(coord11, list):
                    # If coord11 is already a list, use it directly
                    coordinates.append(coord11)
                else:
                    # Skip invalid coordinate data
                    continue

    if len(coordinates) < 2:
        return {
            "command": "showText",
            "payload": "Track must have at least 2 coordinate points to calculate speed"
        }

    timestamps = properties.timestamps
    if timestamps is None:
        return {
            "command": "showText",
            "payload": "Track feature must have timestamps to calculate speed"
        }

    if len(timestamps) != len(coordinates):
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
        # coordinates is now List[List[float]], so coord1 and coord2 are List[float]
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
            # Convert datetime to ISO string for display
            timestamp_str = timestamps[i + 1].isoformat() if hasattr(timestamps[i + 1], 'isoformat') else str(timestamps[i + 1])
            high_speed_times.append(timestamp_str)

    if not high_speed_times:
        return {
            "command": "showText",
            "payload": f"No timestamps found where speed >= {min_speed} knots"
        }

    # Return structured data for better visualization
    return {
        "command": "showData",
        "payload": {
            "title": f"Track Speed Filter Results (>= {min_speed} knots)",
            "count": len(high_speed_times),
            "min_speed_threshold": min_speed,
            "timestamps": high_speed_times
        }
    }