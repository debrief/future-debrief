"""
ToolVault command data models with typed payloads.

This module provides strongly-typed command classes that extend the base ToolVaultCommand
with specific payload types for each command. This ensures type safety when creating
command responses from tools.
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

# Import base models and existing payload classes from tool_call_response
from .tool_call_response import ToolVaultCommand, ShowDataPayload, ShowImagePayload

# Import Debrief feature types
from ..features.debrief_feature_collection import DebriefFeature, DebriefFeatureCollection

# Import state types
from ..states.selection_state import SelectionState
from ..states.viewport_state import ViewportState


# Feature manipulation commands
class AddFeaturesCommand(ToolVaultCommand):
    """Command to add Debrief features to the map."""
    command: Literal["addFeatures"] = "addFeatures"
    payload: List[DebriefFeature] = Field(
        ...,
        description="Array of Debrief features to add to the map"
    )


class UpdateFeaturesCommand(ToolVaultCommand):
    """Command to update existing Debrief features on the map."""
    command: Literal["updateFeatures"] = "updateFeatures"
    payload: List[DebriefFeature] = Field(
        ...,
        description="Array of Debrief features with updated properties"
    )


class DeleteFeaturesCommand(ToolVaultCommand):
    """Command to delete features from the map."""
    command: Literal["deleteFeatures"] = "deleteFeatures"
    payload: List[str] = Field(
        ...,
        description="Array of feature IDs to delete from the map"
    )


class SetFeatureCollectionCommand(ToolVaultCommand):
    """Command to replace the entire feature collection."""
    command: Literal["setFeatureCollection"] = "setFeatureCollection"
    payload: DebriefFeatureCollection = Field(
        ...,
        description="Complete Debrief FeatureCollection to replace current features"
    )


# State management commands
class SetViewportCommand(ToolVaultCommand):
    """Command to update the map viewport."""
    command: Literal["setViewport"] = "setViewport"
    payload: ViewportState = Field(
        ...,
        description="Viewport state to set"
    )


class SetSelectionCommand(ToolVaultCommand):
    """Command to update feature selection."""
    command: Literal["setSelection"] = "setSelection"
    payload: SelectionState = Field(
        ...,
        description="Selection state to set"
    )

# Display commands
class ShowTextCommand(ToolVaultCommand):
    """Command to display text to the user."""
    command: Literal["showText"] = "showText"
    payload: str = Field(
        ...,
        description="Text message to display to the user"
    )


class ShowDataCommand(ToolVaultCommand):
    """Command to display structured data to the user."""
    command: Literal["showData"] = "showData"
    payload: Union[ShowDataPayload, Dict[str, Any]] = Field(
        ...,
        description="Structured data object or raw data to display"
    )


class ShowImageCommand(ToolVaultCommand):
    """Command to display an image to the user."""
    command: Literal["showImage"] = "showImage"
    payload: ShowImagePayload = Field(
        ...,
        description="Image data and metadata"
    )


# Utility commands
class LogLevel(str, Enum):
    """Log level for messages."""
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"


class LogMessagePayload(BaseModel):
    """Structured payload for logMessage command."""
    message: str = Field(..., description="Log message content")
    level: LogLevel = Field(LogLevel.INFO, description="Log level")
    timestamp: Optional[str] = Field(None, description="Optional timestamp")

    class Config:
        extra = "forbid"


class LogMessageCommand(ToolVaultCommand):
    """Command to log a message."""
    command: Literal["logMessage"] = "logMessage"
    payload: Union[str, LogMessagePayload] = Field(
        ...,
        description="Log message string or structured log payload"
    )


class CompositeCommand(ToolVaultCommand):
    """Command to execute multiple commands in sequence."""
    command: Literal["composite"] = "composite"
    payload: List[ToolVaultCommand] = Field(
        ...,
        description="Array of commands to execute in sequence"
    )


# Type union for all specific command types
SpecificCommand = Union[
    AddFeaturesCommand,
    UpdateFeaturesCommand,
    DeleteFeaturesCommand,
    SetFeatureCollectionCommand,
    SetViewportCommand,
    SetSelectionCommand,
    ShowTextCommand,
    ShowDataCommand,
    ShowImageCommand,
    LogMessageCommand,
    CompositeCommand,
]
