"""EditorState Pydantic model for maritime analysis editor state."""

from pydantic import BaseModel, Field
from typing import Optional

from .time_state import TimeState
from .viewport_state import ViewportState
from .selection_state import SelectionState
from ..features.debrief_feature_collection import DebriefFeatureCollection


class EditorState(BaseModel):
    """Aggregated state for a Debrief editor instance containing all sub-state types."""

    featureCollection: Optional[DebriefFeatureCollection] = Field(
        None,
        description="The GeoJSON FeatureCollection data"
    )
    timeState: Optional[TimeState] = Field(
        None,
        description="Current time position state"
    )
    viewportState: Optional[ViewportState] = Field(
        None,
        description="Current map viewport bounds state"
    )
    selectionState: Optional[SelectionState] = Field(
        None,
        description="Current feature selection state"
    )

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "$id": "https://schemas.debrief.com/states/editor-state.schema.json"
        }
    }