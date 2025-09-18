"""TimeState Pydantic model for maritime analysis time control."""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class TimeState(BaseModel):
    """State representing the current time position in a Debrief editor."""

    current: datetime = Field(
        ...,
        description="Current time position as ISO 8601 date-time string"
    )
    start: datetime = Field(
        ...,
        description="Start time of the overall time range as ISO 8601 date-time string"
    )
    end: datetime = Field(
        ...,
        description="End time of the overall time range as ISO 8601 date-time string"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "current": "2025-09-03T12:00:00Z",
                    "start": "2025-09-03T10:00:00Z",
                    "end": "2025-09-03T14:00:00Z"
                }
            ]
        }
    }