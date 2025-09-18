"""
ToolVault command data models with typed payloads.

This module provides strongly-typed command classes that extend the base ToolVaultCommand
with specific payload types for each command. This ensures type safety when creating
command responses from tools.
"""

from typing import List, Any, Dict, Optional, Union, Literal
from pydantic import BaseModel, Field
from enum import Enum

# Import base models and existing payload classes from tool_call_response
from .tool_call_response import (
    ToolVaultCommand,
    CommandType,
    MediaType,
    DataAxis,
    ShowDataPayload,
    ShowImagePayload,
)

# Import Debrief feature types
from ..features.debrief_feature_collection import DebriefFeature, DebriefFeatureCollection


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


# Command factory functions for convenience
def show_text(message: str) -> ShowTextCommand:
    """Create a showText command."""
    return ShowTextCommand(payload=message)


def show_data(data: Union[Dict[str, Any], ShowDataPayload], title: Optional[str] = None) -> ShowDataCommand:
    """Create a showData command."""
    if isinstance(data, dict) and title:
        # Add title to existing dict payload
        data_with_title = {"title": title, **data}
        return ShowDataCommand(payload=data_with_title)
    return ShowDataCommand(payload=data)


def add_features(features: List[DebriefFeature]) -> AddFeaturesCommand:
    """Create an addFeatures command."""
    return AddFeaturesCommand(payload=features)


def update_features(features: List[DebriefFeature]) -> UpdateFeaturesCommand:
    """Create an updateFeatures command."""
    return UpdateFeaturesCommand(payload=features)


def delete_features(feature_ids: List[str]) -> DeleteFeaturesCommand:
    """Create a deleteFeatures command."""
    return DeleteFeaturesCommand(payload=feature_ids)


def set_feature_collection(feature_collection: DebriefFeatureCollection) -> SetFeatureCollectionCommand:
    """Create a setFeatureCollection command."""
    return SetFeatureCollectionCommand(payload=feature_collection)


def show_image(media_type: MediaType, data: str, title: Optional[str] = None) -> ShowImageCommand:
    """Create a showImage command."""
    payload = ShowImagePayload(mediaType=media_type, data=data, title=title)
    return ShowImageCommand(payload=payload)


def log_message(message: str, level: LogLevel = LogLevel.INFO, timestamp: Optional[str] = None) -> LogMessageCommand:
    """Create a logMessage command."""
    if level != LogLevel.INFO or timestamp:
        # Use structured payload for non-default levels or custom timestamps
        payload = LogMessagePayload(message=message, level=level, timestamp=timestamp)
    else:
        # Use simple string payload for basic info messages
        payload = message
    return LogMessageCommand(payload=payload)


def composite(*commands: ToolVaultCommand) -> CompositeCommand:
    """Create a composite command from multiple commands."""
    return CompositeCommand(payload=list(commands))


# Type union for all specific command types
SpecificCommand = Union[
    AddFeaturesCommand,
    UpdateFeaturesCommand,
    DeleteFeaturesCommand,
    SetFeatureCollectionCommand,
    ShowTextCommand,
    ShowDataCommand,
    ShowImageCommand,
    LogMessageCommand,
    CompositeCommand,
]