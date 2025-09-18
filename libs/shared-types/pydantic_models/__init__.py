"""Pydantic models for Debrief maritime analysis types."""

from .features.track import DebriefTrackFeature
from .features.point import DebriefPointFeature
from .features.annotation import DebriefAnnotationFeature
from .features.feature_collection import DebriefFeatureCollection, DebriefFeature

from .states.time_state import TimeState
from .states.viewport_state import ViewportState
from .states.selection_state import SelectionState
from .states.editor_state import EditorState
from .states.current_state import CurrentState

from .tools.json_schema import JSONSchema
from .tools.tool import Tool
from .tools.tool_call_request import ToolCallRequest
from .tools.tool_call_response import ToolCallResponse
from .tools.tool_list_response import ToolListResponse
from .tools.constrained_feature import GeometryConstrainedFeature
from .tools.tool_file_reference import ToolFileReference, SampleInputReference
from .tools.git_history import GitHistoryEntry, GitAuthor, GitHistory
from .tools.tool_stats import ToolStatsModel
from .tools.tool_index import ToolIndexModel, ToolFilesCollection
from .tools.global_tool_index import GlobalToolIndexModel, PackageInfo
from .tools.tool_metadata import ToolMetadataModel, SampleInputData
from .tools.commands import (
    AddFeaturesCommand,
    UpdateFeaturesCommand,
    DeleteFeaturesCommand,
    SetFeatureCollectionCommand,
    ShowTextCommand,
    ShowDataCommand,
    ShowImageCommand,
    LogMessageCommand,
    LogMessagePayload,
)

__all__ = [
    # Features
    "DebriefTrackFeature",
    "DebriefPointFeature",
    "DebriefAnnotationFeature",
    "DebriefFeatureCollection",
    "DebriefFeature",

    # States
    "TimeState",
    "ViewportState",
    "SelectionState",
    "EditorState",
    "CurrentState",

    # Tools - Basic
    "JSONSchema",
    "Tool",
    "ToolCallRequest",
    "ToolCallResponse",
    "ToolListResponse",
    "GeometryConstrainedFeature",

    # Tools - New Index Models
    "ToolFileReference",
    "SampleInputReference",
    "GitHistoryEntry",
    "GitAuthor",
    "GitHistory",
    "ToolStatsModel",
    "ToolIndexModel",
    "ToolFilesCollection",
    "GlobalToolIndexModel",
    "PackageInfo",
    "ToolMetadataModel",
    "SampleInputData",

    # Tools - Command Models
    "AddFeaturesCommand",
    "UpdateFeaturesCommand",
    "DeleteFeaturesCommand",
    "SetFeatureCollectionCommand",
    "ShowTextCommand",
    "ShowDataCommand",
    "ShowImageCommand",
    "LogMessageCommand",
    "LogMessagePayload",
]