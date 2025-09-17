"""SelectionState Pydantic model for maritime analysis feature selection."""

from pydantic import BaseModel, Field, validator
from typing import List, Union, Set


class SelectionState(BaseModel):
    """State representing the currently selected features in a Debrief editor."""

    selectedIds: List[Union[str, int]] = Field(
        ...,
        description="Array of selected feature IDs"
    )

    @validator('selectedIds')
    def validate_unique_ids(cls, v):
        """Ensure IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError('selectedIds must contain unique values')
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "selectedIds": ["id-123", "id-456"]
                },
                {
                    "selectedIds": [123, 456]
                },
                {
                    "selectedIds": []
                }
            ]
        }
    }