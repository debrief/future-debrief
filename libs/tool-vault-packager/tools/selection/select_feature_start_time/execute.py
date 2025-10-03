"""Set TimeState current to the earliest timestamp from features."""

from datetime import datetime, timezone
from typing import List

# Use hierarchical imports from shared-types
from debrief.types.features import DebriefFeature
from debrief.types.states import TimeState
from debrief.types.tools import DebriefCommand, SetTimeStateCommand, ShowTextCommand
from pydantic import BaseModel, Field


class SelectFeatureStartTimeParameters(BaseModel):
    """Parameters for select_feature_start_time tool."""

    features: List[DebriefFeature] = Field(
        description="Array of Debrief features to analyze for timestamps",
        examples=[
            [
                {
                    "type": "Feature",
                    "id": "track-001",
                    "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
                    "properties": {
                        "dataType": "track",
                        "timestamps": ["2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z"],
                    },
                }
            ]
        ],
    )

    current_time_state: TimeState = Field(
        description="Current time state to update",
        examples=[
            {
                "current": "2024-01-01T12:00:00Z",
                "start": "2024-01-01T00:00:00Z",
                "end": "2024-01-01T23:59:59Z",
            }
        ],
    )


def select_feature_start_time(params: SelectFeatureStartTimeParameters) -> DebriefCommand:
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
            timestamps = getattr(properties, "timestamps", None)

            if not timestamps:
                continue

            # Parse timestamps and find the earliest
            for timestamp_value in timestamps:
                timestamp = None

                if isinstance(timestamp_value, datetime):
                    timestamp = timestamp_value
                elif isinstance(timestamp_value, str):
                    try:
                        timestamp = datetime.fromisoformat(timestamp_value.replace("Z", "+00:00"))
                    except ValueError:
                        continue
                else:
                    continue

                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)

                if earliest_timestamp is None or timestamp < earliest_timestamp:
                    earliest_timestamp = timestamp

        if earliest_timestamp is None:
            return ShowTextCommand(payload="No valid timestamps found in features")

        updated_time_state = params.current_time_state.model_copy(
            update={"current": earliest_timestamp}
        )

        return SetTimeStateCommand(payload=updated_time_state)

    except Exception as e:
        return ShowTextCommand(payload=f"Error finding earliest timestamp: {str(e)}")
