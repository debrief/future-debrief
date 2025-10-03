"""
Debrief command data models with typed payloads.

This module provides strongly-typed command classes that extend the base DebriefCommand
with specific payload types for each command. These commands trigger state changes in Debrief
and ensure type safety when creating command responses from Tool Vault tools.
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

# Import base models and existing payload classes from tool_call_response
from .tool_call_response import DebriefCommand, ShowDataPayload, ShowImagePayload

# Import Debrief feature types
from ..features.debrief_feature_collection import DebriefFeature, DebriefFeatureCollection

# Import state types
from ..states.selection_state import SelectionState
from ..states.time_state import TimeState
from ..states.viewport_state import ViewportState


# Feature manipulation commands
class AddFeaturesCommand(DebriefCommand):
    """Command to add Debrief features to the map."""
    command: Literal["addFeatures"] = "addFeatures"
    payload: List[DebriefFeature] = Field(
        ...,
        description="Array of Debrief features to add to the map"
    )


class UpdateFeaturesCommand(DebriefCommand):
    """Command to update existing Debrief features on the map."""
    command: Literal["updateFeatures"] = "updateFeatures"
    payload: List[DebriefFeature] = Field(
        ...,
        description="Array of Debrief features with updated properties"
    )


class DeleteFeaturesCommand(DebriefCommand):
    """Command to delete features from the map."""
    command: Literal["deleteFeatures"] = "deleteFeatures"
    payload: List[str] = Field(
        ...,
        description="Array of feature IDs to delete from the map"
    )


class SetFeatureCollectionCommand(DebriefCommand):
    """Command to replace the entire feature collection."""
    command: Literal["setFeatureCollection"] = "setFeatureCollection"
    payload: DebriefFeatureCollection = Field(
        ...,
        description="Complete Debrief FeatureCollection to replace current features"
    )


# State management commands
class SetViewportCommand(DebriefCommand):
    """Command to update the map viewport."""
    command: Literal["setViewport"] = "setViewport"
    payload: ViewportState = Field(
        ...,
        description="Viewport state to set"
    )


class SetSelectionCommand(DebriefCommand):
    """Command to update feature selection."""
    command: Literal["setSelection"] = "setSelection"
    payload: SelectionState = Field(
        ...,
        description="Selection state to set"
    )


class SetTimeStateCommand(DebriefCommand):
    """Command to update the editor time state."""
    command: Literal["setTimeState"] = "setTimeState"
    payload: TimeState = Field(
        ...,
        description="Time state to apply"
    )

# Display commands
class ShowTextCommand(DebriefCommand):
    """Command to display text to the user."""
    command: Literal["showText"] = "showText"
    payload: str = Field(
        ...,
        description="Text message to display to the user"
    )


class ShowDataCommand(DebriefCommand):
    """Command to display structured data to the user."""
    command: Literal["showData"] = "showData"
    payload: Union[ShowDataPayload, Dict[str, Any]] = Field(
        ...,
        description="Structured data object or raw data to display"
    )


class ShowImageCommand(DebriefCommand):
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


class LogMessageCommand(DebriefCommand):
    """Command to log a message."""
    command: Literal["logMessage"] = "logMessage"
    payload: Union[str, LogMessagePayload] = Field(
        ...,
        description="Log message string or structured log payload"
    )


class CompositeCommand(DebriefCommand):
    """Command to execute multiple commands in sequence."""
    command: Literal["composite"] = "composite"
    payload: List[DebriefCommand] = Field(
        ...,
        description="Array of Debrief commands to execute in sequence"
    )


# Type union for all specific command types
SpecificCommand = Union[
    AddFeaturesCommand,
    UpdateFeaturesCommand,
    DeleteFeaturesCommand,
    SetFeatureCollectionCommand,
    SetViewportCommand,
    SetSelectionCommand,
    SetTimeStateCommand,
    ShowTextCommand,
    ShowDataCommand,
    ShowImageCommand,
    LogMessageCommand,
    CompositeCommand,
]
