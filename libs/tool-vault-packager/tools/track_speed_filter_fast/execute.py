"""Fast track speed filtering tool using pre-calculated speeds."""

from typing import List

from debrief.types.features import DebriefTrackFeature
from debrief.types.tools import ToolVaultCommand
from debrief.types.tools.tool_call_response import CommandType
from pydantic import BaseModel, Field, ValidationError, model_validator


class TrackFeatureWithSpeeds(BaseModel):
    """A Track feature that extends the base Track with REQUIRED speeds array."""

    # Use the shared-types DebriefTrackFeature directly
    track_feature: DebriefTrackFeature = Field(
        description="Track feature data that will be validated as DebriefTrackFeature + speeds constraint"
    )

    @model_validator(mode='after')
    def validate_track_with_speeds(self):
        """Validate that track feature has required speeds array."""
        track_feature = self.track_feature

        # Additional constraint: require speeds array
        properties = track_feature.properties
        speeds = getattr(properties, 'speeds', None) if hasattr(properties, 'speeds') else None

        if speeds is None:
            raise ValueError("Track feature must have a 'speeds' array in properties for fast filtering")

        if not isinstance(speeds, list):
            raise ValueError("speeds property must be a list")

        if not speeds:  # Empty list
            raise ValueError("speeds array cannot be empty")

        if not all(isinstance(s, (int, float)) and s >= 0 for s in speeds):
            raise ValueError("All speeds must be non-negative numbers")

        # Validate array length alignment
        geometry = track_feature.geometry
        geom_type = geometry.type

        if geom_type == "LineString":
            coord_count = len(geometry.coordinates)
        elif geom_type == "MultiLineString":
            coord_count = sum(len(line) for line in geometry.coordinates)
        else:
            raise ValueError(f"Unsupported geometry type: {geom_type}")

        timestamps = properties.timestamps

        if len(speeds) != coord_count:
            raise ValueError(f"speeds array length ({len(speeds)}) must match coordinate count ({coord_count})")

        if timestamps and len(timestamps) != coord_count:
            raise ValueError(f"timestamps array length ({len(timestamps)}) must match coordinate count ({coord_count})")

        return self

    @property
    def base_track(self) -> DebriefTrackFeature:
        """Get the validated shared-types DebriefTrackFeature."""
        return self.track_feature

    @property
    def speeds(self) -> List[float]:
        """Get the speeds array."""
        return getattr(self.track_feature.properties, 'speeds', [])

    @property
    def timestamps(self) -> List[str]:
        """Get the timestamps as strings."""
        # Convert datetime objects to strings if needed
        timestamps = self.track_feature.properties.timestamps
        if timestamps and hasattr(timestamps[0], 'isoformat'):
            return [ts.isoformat() for ts in timestamps]
        return [str(ts) for ts in timestamps] if timestamps else []


class TrackSpeedFilterFastParameters(BaseModel):
    """Parameters for the track_speed_filter_fast tool."""

    track_feature: DebriefTrackFeature = Field(
        description="A Track feature conforming to shared-types Track schema, with additional required 'speeds' array in properties",
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

    @model_validator(mode='after')
    def validate_track_feature_with_speeds(self):
        """Create and validate the constrained TrackFeatureWithSpeeds."""
        # Use our constrained wrapper for validation
        constrained_track = TrackFeatureWithSpeeds(track_feature=self.track_feature)
        self._constrained_track = constrained_track
        return self

    min_speed: float = Field(
        default=10.0,
        description="Minimum speed threshold in knots",
        ge=0.0,
        examples=[5.0, 10.0, 15.0, 20.0]
    )



def track_speed_filter_fast(params: TrackSpeedFilterFastParameters) -> ToolVaultCommand:
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
        ...         )
        ...     },
        ...     min_speed=10.0
        ... )
        >>> result = track_speed_filter_fast(params)
        >>> result["command"]
        'showText'
    """
    try:
        # Access the constrained track wrapper created during validation
        constrained_track = params._constrained_track
        min_speed = params.min_speed

        # Get speeds and timestamps from the wrapper's convenience properties
        speeds = constrained_track.speeds  # List[float] - guaranteed to exist and be valid
        timestamps = constrained_track.timestamps  # List[str] - guaranteed to match speeds length

        # Find timestamps where speed meets or exceeds threshold
        high_speed_times = []

        for i, speed in enumerate(speeds):
            if speed >= min_speed:
                high_speed_times.append(timestamps[i])

        if not high_speed_times:
            return ToolVaultCommand(
                command=CommandType.SHOW_TEXT,
                payload=f"No timestamps found where speed >= {min_speed} knots"
            )

        # Return structured data for better visualization
        return ToolVaultCommand(
            command=CommandType.SHOW_DATA,
            payload={
                "title": f"Fast Track Speed Filter Results (>= {min_speed} knots)",
                "count": len(high_speed_times),
                "min_speed_threshold": min_speed,
                "timestamps": high_speed_times,
                "method": "pre-calculated speeds"
            }
        )

    except ValidationError as e:
        return ToolVaultCommand(
            command=CommandType.SHOW_TEXT,
            payload=f"Input validation failed: {e.errors()[0]['msg']} at {e.errors()[0]['loc']}"
        )
    except ValueError as e:
        return ToolVaultCommand(
            command=CommandType.SHOW_TEXT,
            payload=f"Invalid track data: {str(e)}"
        )
    except Exception as e:
        return ToolVaultCommand(
            command=CommandType.SHOW_TEXT,
            payload=f"Speed filtering failed: {str(e)}"
        )
