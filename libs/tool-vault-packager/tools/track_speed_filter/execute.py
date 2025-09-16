"""Track speed filtering tool for maritime analysis."""

import math
from typing import Dict, Any
from pydantic import BaseModel, Field, model_validator
from debrief.types import TrackFeature


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

        # Convert to shared-types TrackFeature for validation and processing
        try:
            track_feature_obj = TrackFeature.from_dict(track_data)
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
        ...     track_feature=TrackFeature(
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
    coordinates = []
    if geometry.type.value == "LineString":
        coordinates = geometry.coordinates
    elif geometry.type.value == "MultiLineString":
        # For MultiLineString, concatenate all coordinate arrays
        for line_coords in geometry.coordinates:
            coordinates.extend(line_coords)

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

    return {
        "command": "showText",
        "payload": f"Found {len(high_speed_times)} timestamps with speed >= {min_speed} knots:\n" +
                  "\n".join(high_speed_times)
    }