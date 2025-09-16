"""Fast track speed filtering tool using pre-calculated speeds."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field, model_validator
from debrief.types import TrackFeature


def _track_with_speeds_schema() -> Dict[str, Any]:
    """Generate JSON Schema for Track with required speeds property."""
    return {
        "allOf": [
            {
                "$ref": "https://example.org/debrief/schemas/features/Track.schema.json"
            },
            {
                "type": "object",
                "properties": {
                    "properties": {
                        "type": "object",
                        "required": ["dataType", "speeds"],
                        "properties": {
                            "speeds": {
                                "type": "array",
                                "description": "Array of pre-calculated speeds in knots corresponding to each coordinate point",
                                "items": {
                                    "type": "number",
                                    "minimum": 0
                                },
                                "examples": [
                                    [15.2, 18.7, 12.3, 20.1],
                                    [5.0, 10.5, 8.2]
                                ]
                            }
                        }
                    }
                }
            }
        ]
    }


class TrackSpeedFilterFastParameters(BaseModel):
    """Parameters for the track_speed_filter_fast tool."""

    track_feature: Dict[str, Any] = Field(
        json_schema_extra=_track_with_speeds_schema(),
        description="A Track feature with pre-calculated speeds array in properties.speeds",
        examples=[
            {
                "type": "Feature",
                "id": "track_fast_001",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[0, 0], [0.01, 0.01], [0.02, 0.02]]
                },
                "properties": {
                    "dataType": "track",
                    "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z", "2023-01-01T10:02:00Z"],
                    "speeds": [15.2, 18.7, 12.3],
                    "name": "High Speed Track",
                    "description": "Track with pre-calculated speeds"
                }
            }
        ]
    )

    min_speed: float = Field(
        default=10.0,
        description="Minimum speed threshold in knots",
        ge=0.0,
        examples=[5.0, 10.0, 15.0, 20.0]
    )

    @model_validator(mode='after')
    def validate_track_with_speeds(self):
        """Validate Track feature and ensure it has speeds array."""
        track_data = self.track_feature

        # Convert to shared-types TrackFeature for basic validation
        try:
            track_feature_obj = TrackFeature.from_dict(track_data)
            self._track_feature_obj = track_feature_obj
        except Exception as e:
            raise ValueError(f"Invalid track feature structure: {e}")

        # Additional validation for speeds array
        properties = track_data.get("properties", {})
        speeds = properties.get("speeds")

        if speeds is None:
            raise ValueError("Track feature must have a 'speeds' array in properties for fast filtering")

        if not isinstance(speeds, list):
            raise ValueError("speeds property must be an array")

        if not all(isinstance(s, (int, float)) and s >= 0 for s in speeds):
            raise ValueError("All speeds must be non-negative numbers")

        # Check that speeds array length matches coordinates
        geometry = track_data.get("geometry", {})
        coordinates = geometry.get("coordinates", [])

        if geometry.get("type") == "LineString":
            coord_count = len(coordinates)
        elif geometry.get("type") == "MultiLineString":
            coord_count = sum(len(line) for line in coordinates)
        else:
            coord_count = 0

        if len(speeds) != coord_count:
            raise ValueError(f"speeds array length ({len(speeds)}) must match coordinate count ({coord_count})")

        return self


def track_speed_filter_fast(params: TrackSpeedFilterFastParameters) -> Dict[str, Any]:
    """
    Filter track timestamps using pre-calculated speeds array for fast processing.

    This function analyzes a Track feature that already contains pre-calculated speeds
    and returns timestamps where the speed meets or exceeds the specified minimum
    threshold. This is much faster than the standard track_speed_filter as it
    bypasses the haversine distance calculations.

    Args:
        params: TrackSpeedFilterFastParameters containing track_feature with speeds and min_speed

    Returns:
        Dict[str, Any]: ToolVault command object containing filtered timestamps
                       or appropriate message

    Examples:
        >>> from pydantic import ValidationError
        >>> params = TrackSpeedFilterFastParameters(
        ...     track_feature={
        ...         "type": "Feature",
        ...         "id": "test",
        ...         "geometry": {
        ...             "type": "LineString",
        ...             "coordinates": [[0, 0], [0.01, 0.01]]
        ...         },
        ...         "properties": {
        ...             "dataType": "track",
        ...             "timestamps": ["2023-01-01T10:00:00Z", "2023-01-01T10:01:00Z"],
        ...             "speeds": [15.0, 8.0]
        ...         }
        ...     },
        ...     min_speed=10.0
        ... )
        >>> result = track_speed_filter_fast(params)
        >>> result["command"]
        'showText'
    """
    # Extract validated parameters
    track_feature = params._track_feature_obj
    min_speed = params.min_speed

    properties = track_feature.properties
    speeds = params.track_feature["properties"]["speeds"]  # Use raw dict for speeds
    timestamps = properties.timestamps

    if timestamps is None:
        return {
            "command": "showText",
            "payload": "Track feature must have timestamps for speed filtering"
        }

    if len(timestamps) != len(speeds):
        return {
            "command": "showText",
            "payload": f"Timestamp count ({len(timestamps)}) must match speeds count ({len(speeds)})"
        }

    # Find timestamps where speed meets or exceeds threshold
    high_speed_times = []

    for i, speed in enumerate(speeds):
        if speed >= min_speed:
            # Convert datetime to ISO string for display
            timestamp_str = timestamps[i].isoformat() if hasattr(timestamps[i], 'isoformat') else str(timestamps[i])
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