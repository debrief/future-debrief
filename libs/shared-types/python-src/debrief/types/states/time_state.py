"""TimeState Pydantic model for maritime analysis time control."""

from pydantic import BaseModel, Field


class TimeState(BaseModel):
    """State representing the current time position in a Debrief editor."""

    current: str = Field(
        ...,
        description="Current time position as ISO 8601 date-time string",
        json_schema_extra={"format": "date-time"}
    )
    start: str = Field(
        ...,
        description="Start time of the overall time range as ISO 8601 date-time string",
        json_schema_extra={"format": "date-time"}
    )
    end: str = Field(
        ...,
        description="End time of the overall time range as ISO 8601 date-time string",
        json_schema_extra={"format": "date-time"}
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
