"""ViewportState Pydantic model for maritime analysis viewport control."""

from pydantic import BaseModel, Field, validator
from typing import List


class ViewportState(BaseModel):
    """State representing the current map viewport bounds in a Debrief editor."""

    bounds: List[float] = Field(
        ...,
        description="Map bounds as [west, south, east, north] in decimal degrees",
        min_length=4,
        max_length=4
    )

    @validator('bounds')
    def validate_bounds(cls, v):
        """Validate that bounds array has exactly 4 elements."""
        if len(v) != 4:
            raise ValueError('bounds must contain exactly 4 elements [west, south, east, north]')
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "bounds": [-10.0, 50.0, 2.0, 58.0]
                }
            ]
        }
    }