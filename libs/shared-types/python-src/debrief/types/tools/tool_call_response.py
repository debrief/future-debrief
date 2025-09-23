"""ToolCallResponse Pydantic model for tool execution results."""

from pydantic import BaseModel, Field
from typing import Any, List, Union, Optional
from enum import Enum


class CommandType(str, Enum):
    """Valid ToolVault command types."""
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


class ToolVaultCommand(BaseModel):
    """A command returned by a ToolVault tool."""
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


class ToolCallResponse(BaseModel):
    """Response format for tool execution results containing ToolVault commands."""

    result: ToolVaultCommand = Field(
        ...,
        description="A command returned by a ToolVault tool"
    )
    isError: bool = Field(
        False,
        description="Optional flag indicating if the result represents an error condition"
    )

    class Config:
        extra = "forbid"  # No additional properties