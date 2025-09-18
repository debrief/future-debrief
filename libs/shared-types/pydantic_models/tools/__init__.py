"""Tools module exports."""

from .json_schema import JSONSchema, JSONSchemaProperty, JSONSchemaType
from .tool import Tool
from .tool_call_request import ToolCallRequest, ToolArgument
from .tool_call_response import (
    ToolCallResponse,
    ToolVaultCommand,
    CommandType,
    MediaType,
    DataAxis,
    ShowDataPayload,
    ShowImagePayload,
    CompositeCommand
)
from .tool_list_response import ToolListResponse
from .constrained_feature import (
    GeometryConstrainedFeature,
    GeometryType,
    DataType
)
from .tool_file_reference import ToolFileReference, SampleInputReference
from .git_history import GitHistoryEntry, GitAuthor, GitHistory
from .tool_stats import ToolStatsModel
from .tool_index import ToolIndexModel, ToolFilesCollection
from .global_tool_index import GlobalToolIndexModel, PackageInfo
from .tool_metadata import ToolMetadataModel, SampleInputData
from .commands import (
    AddFeaturesCommand,
    UpdateFeaturesCommand,
    DeleteFeaturesCommand,
    SetFeatureCollectionCommand,
    ShowTextCommand,
    ShowDataCommand,
    ShowImageCommand,
    LogMessageCommand,
    LogLevel,
    LogMessagePayload,
    SpecificCommand,
    # Factory functions
    show_text,
    show_data,
    add_features,
    update_features,
    delete_features,
    set_feature_collection,
    show_image,
    log_message,
    composite,
)

__all__ = [
    "JSONSchema",
    "JSONSchemaProperty",
    "JSONSchemaType",
    "Tool",
    "ToolCallRequest",
    "ToolArgument",
    "ToolCallResponse",
    "ToolVaultCommand",
    "CommandType",
    "MediaType",
    "DataAxis",
    "ShowDataPayload",
    "ShowImagePayload",
    "CompositeCommand",
    "ToolListResponse",
    "GeometryConstrainedFeature",
    "GeometryType",
    "DataType",
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
    # Typed commands
    "AddFeaturesCommand",
    "UpdateFeaturesCommand",
    "DeleteFeaturesCommand",
    "SetFeatureCollectionCommand",
    "ShowTextCommand",
    "ShowDataCommand",
    "ShowImageCommand",
    "LogMessageCommand",
    "LogLevel",
    "LogMessagePayload",
    "SpecificCommand",
    # Command factory functions
    "show_text",
    "show_data",
    "add_features",
    "update_features",
    "delete_features",
    "set_feature_collection",
    "show_image",
    "log_message",
    "composite",
]