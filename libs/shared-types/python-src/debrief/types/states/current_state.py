"""CurrentState Pydantic model for maritime analysis complete state."""

from pydantic import BaseModel, Field
from .editor_state import EditorState


class CurrentState(BaseModel):
    """Complete current state information for a Debrief editor including metadata."""

    editorId: str = Field(
        ...,
        description="Unique identifier for the editor"
    )
    filename: str = Field(
        ...,
        description="Filename of the document being edited"
    )
    editorState: EditorState = Field(
        ...,
        description="Complete editor state containing all sub-states"
    )
    historyCount: int = Field(
        ...,
        ge=0,
        description="History count for this editor"
    )

    model_config = {
        "extra": "forbid",
        "json_schema_extra": {
            "$id": "https://schemas.debrief.com/states/current-state.schema.json"
        }
    }