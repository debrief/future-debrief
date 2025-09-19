"""Set TimeState current to the earliest timestamp from features."""

from typing import List
from pydantic import BaseModel, Field
from datetime import datetime

# Use hierarchical imports from shared-types
from debrief.types.features import DebriefFeature
from debrief.types.states import TimeState
from debrief.types.tools import ToolVaultCommand

class SelectFeatureStartTimeParameters(BaseModel):
    """Parameters for selectFeatureStartTime tool."""

    features: List[DebriefFeature] = Field(
        description="Array of Debrief features to analyze for timestamps",
        examples=[[{
            "type": "Feature",
            "id": "track-001",
            "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
            "properties": {
                "dataType": "track",
                "timestamps": ["2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z"]
            }
        }]]
    )

    current_time_state: TimeState = Field(
        description="Current time state to update",
        examples=[{
            "current": "2024-01-01T12:00:00Z",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-01T23:59:59Z"
        }]
    )


def selectFeatureStartTime(params: SelectFeatureStartTimeParameters) -> ToolVaultCommand:
    """
    Set TimeState current to the earliest timestamp from any feature.

    Analyzes the timestamps property of features and sets TimeState.current
    to the earliest timestamp found across all features.

    Args:
        params: Features to analyze and current TimeState

    Returns:
        SetTimeCommand to update the time state
    """
    try:
        earliest_timestamp = None

        for feature in params.features:
            # Get timestamps from feature properties
            properties = feature.properties
            if not properties:
                continue
            timestamps = getattr(properties, 'timestamps', None)

            if not timestamps:
                continue

            # Parse timestamps and find the earliest
            for timestamp_str in timestamps:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    if earliest_timestamp is None or timestamp < earliest_timestamp:
                        earliest_timestamp = timestamp
                except (ValueError, AttributeError):
                    continue

        if earliest_timestamp is None:
            return {
                "command": "showText",
                "payload": "No valid timestamps found in features"
            }

        # Create setState command with updated time state
        return {
            "command": "setTimeState",
            "payload": {
                "current": earliest_timestamp.isoformat().replace('+00:00', 'Z'),
                "start": params.current_time_state.start.isoformat().replace('+00:00', 'Z'),
                "end": params.current_time_state.end.isoformat().replace('+00:00', 'Z')
            }
        }

    except Exception as e:
        return {
            "command": "showText",
            "payload": f"Error finding earliest timestamp: {str(e)}"
        }