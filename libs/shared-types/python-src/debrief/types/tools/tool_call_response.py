"""ToolCallResponse Pydantic model for tool execution results."""

from abc import ABC
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field, model_serializer


class CommandType(str, Enum):
    """Valid Debrief command types."""
    ADD_FEATURES = "addFeatures"
    UPDATE_FEATURES = "updateFeatures"
    DELETE_FEATURES = "deleteFeatures"
    SET_FEATURE_COLLECTION = "setFeatureCollection"
    SET_VIEWPORT = "setViewport"
    SET_SELECTION = "setSelection"
    SET_TIME_STATE = "setTimeState"
    SHOW_TEXT = "showText"
    SHOW_DATA = "showData"
    SHOW_IMAGE = "showImage"
    LOG_MESSAGE = "logMessage"
    COMPOSITE = "composite"


class MediaType(str, Enum):
    """Valid media types for image commands."""
    PNG = "image/png"
    SVG = "image/svg+xml"


class DataAxis(BaseModel):
    """Axis definition for tabular data."""
    name: str = Field(..., description="Axis name")
    values: Optional[List[Any]] = Field(None, description="Optional axis values")

    class Config:
        extra = "forbid"


class ShowDataPayload(BaseModel):
    """Payload for showData command."""
    shape: List[int] = Field(
        ...,
        description="Array shape as list of positive integers",
        min_length=1
    )
    axes: List[DataAxis] = Field(
        ...,
        description="Array axes with names and optional values"
    )
    values: List[Any] = Field(
        ...,
        description="Flattened array values"
    )

    class Config:
        extra = "forbid"


class ShowImagePayload(BaseModel):
    """Payload for showImage command."""
    mediaType: MediaType = Field(
        ...,
        description="Image media type"
    )
    data: str = Field(
        ...,
        description="Base64-encoded image data"
    )
    title: Optional[str] = Field(
        None,
        description="Optional title for the image"
    )

    class Config:
        extra = "forbid"


class CompositeCommand(BaseModel):
    """Individual command within a composite command."""
    command: str = Field(..., description="Command type")
    payload: Any = Field(..., description="Command payload")

    class Config:
        extra = "forbid"


def _normalise_output(value: Any) -> Any:
    """Recursively normalise command output for JSON comparisons."""
    if isinstance(value, dict):
        return {key: _normalise_output(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [_normalise_output(item) for item in value]
    if isinstance(value, Enum):
        return value.value
    return value


class DebriefCommand(BaseModel, ABC):
    """A command that triggers state changes in Debrief (returned by Tool Vault tools)."""

    command: CommandType = Field(
        ...,
        description="The command type"
    )
    payload: Any = Field(
        ...,
        description="Command-specific payload"
    )

    class Config:
        extra = "forbid"

    def __init__(self, **data: Any) -> None:
        """Prevent direct instantiation of the abstract base command."""
        if self.__class__ is DebriefCommand:
            raise TypeError("DebriefCommand is abstract and cannot be instantiated directly")
        super().__init__(**data)

    @model_serializer(mode="plain")
    def _serialize(self) -> Any:
        """Ensure commands serialise with enum values, lists, and without nulls."""
        data = {
            "command": self.command,
            "payload": self.payload,
        }
        return _normalise_output(data)


def _debrief_command_model_dump(self: DebriefCommand, *args: Any, **kwargs: Any) -> Any:
    """Monkey-patched serializer to match legacy expectations by default."""
    if "mode" not in kwargs:
        kwargs["mode"] = "json"
    if "exclude_none" not in kwargs:
        kwargs["exclude_none"] = False
    data = BaseModel.model_dump(self, *args, **kwargs)
    return _normalise_output(data)


DebriefCommand.model_dump = _debrief_command_model_dump  # type: ignore[attr-defined]


class ToolCallResponse(BaseModel):
    """Response format for tool execution results containing Debrief commands."""

    result: DebriefCommand = Field(
        ...,
        description="A command that triggers state changes in Debrief"
    )
    isError: bool = Field(
        False,
        description="Optional flag indicating if the result represents an error condition"
    )

    class Config:
        extra = "forbid"  # No additional properties
