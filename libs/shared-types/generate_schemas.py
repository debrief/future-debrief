#!/usr/bin/env python3
"""
Generate JSON Schema files from Pydantic models.

This script focuses solely on JSON Schema generation from Pydantic models.
All other build logic (TypeScript generation, file copying, etc.) is handled by the Makefile.
"""

import json
import sys
from pathlib import Path
import os

# Add python-src to path for new package structure
script_dir = os.path.dirname(os.path.abspath(__file__))
python_src_path = os.path.join(script_dir, "python-src")
sys.path.insert(0, python_src_path)

# Import Pydantic models directly
from debrief.types.features.track import DebriefTrackFeature
from debrief.types.features.point import DebriefPointFeature
from debrief.types.features.annotation import DebriefAnnotationFeature
from debrief.types.features.feature_collection import DebriefFeatureCollection

from debrief.types.states.time_state import TimeState
from debrief.types.states.viewport_state import ViewportState
from debrief.types.states.selection_state import SelectionState
from debrief.types.states.editor_state import EditorState
from debrief.types.states.current_state import CurrentState

from debrief.types.tools.json_schema import JSONSchema
from debrief.types.tools.tool import Tool
from debrief.types.tools.tool_call_request import ToolCallRequest
from debrief.types.tools.tool_call_response import ToolCallResponse
from debrief.types.tools.tool_list_response import ToolListResponse
from debrief.types.tools.constrained_feature import GeometryConstrainedFeature
from debrief.types.tools.tool_file_reference import ToolFileReference, SampleInputReference
from debrief.types.tools.git_history import GitHistoryEntry, GitAuthor, GitHistory
from debrief.types.tools.tool_stats import ToolStatsModel
from debrief.types.tools.tool_index import ToolIndexModel, ToolFilesCollection
from debrief.types.tools.global_tool_index import GlobalToolIndexModel, PackageInfo
from debrief.types.tools.tool_metadata import ToolMetadataModel, SampleInputData
from debrief.types.tools.commands import (
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


def generate_json_schema(model_class, output_path):
    """Generate a single JSON Schema file from a Pydantic model."""
    schema = model_class.model_json_schema()

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(schema, f, indent=2)

    print(f"Generated: {output_path}")


def main():
    """Generate all JSON Schema files from Pydantic models."""
    # Define the models and their output file names
    models = {
        # Features
        "derived/json-schema/Track.schema.json": DebriefTrackFeature,
        "derived/json-schema/Point.schema.json": DebriefPointFeature,
        "derived/json-schema/Annotation.schema.json": DebriefAnnotationFeature,
        "derived/json-schema/FeatureCollection.schema.json": DebriefFeatureCollection,

        # States
        "derived/json-schema/TimeState.schema.json": TimeState,
        "derived/json-schema/ViewportState.schema.json": ViewportState,
        "derived/json-schema/SelectionState.schema.json": SelectionState,
        "derived/json-schema/EditorState.schema.json": EditorState,
        "derived/json-schema/CurrentState.schema.json": CurrentState,

        # Tools - Basic
        "derived/json-schema/JSONSchema.schema.json": JSONSchema,
        "derived/json-schema/Tool.schema.json": Tool,
        "derived/json-schema/ToolCallRequest.schema.json": ToolCallRequest,
        "derived/json-schema/ToolCallResponse.schema.json": ToolCallResponse,
        "derived/json-schema/ToolListResponse.schema.json": ToolListResponse,
        "derived/json-schema/ConstrainedFeature.schema.json": GeometryConstrainedFeature,

        # Tools - New Index Models
        "derived/json-schema/ToolFileReference.schema.json": ToolFileReference,
        "derived/json-schema/SampleInputReference.schema.json": SampleInputReference,
        "derived/json-schema/GitHistoryEntry.schema.json": GitHistoryEntry,
        "derived/json-schema/GitAuthor.schema.json": GitAuthor,
        "derived/json-schema/GitHistory.schema.json": GitHistory,
        "derived/json-schema/ToolStatsModel.schema.json": ToolStatsModel,
        "derived/json-schema/ToolIndexModel.schema.json": ToolIndexModel,
        "derived/json-schema/ToolFilesCollection.schema.json": ToolFilesCollection,
        "derived/json-schema/GlobalToolIndexModel.schema.json": GlobalToolIndexModel,
        "derived/json-schema/PackageInfo.schema.json": PackageInfo,
        "derived/json-schema/ToolMetadataModel.schema.json": ToolMetadataModel,
        "derived/json-schema/SampleInputData.schema.json": SampleInputData,

        # Tools - Command Models
        "derived/json-schema/AddFeaturesCommand.schema.json": AddFeaturesCommand,
        "derived/json-schema/UpdateFeaturesCommand.schema.json": UpdateFeaturesCommand,
        "derived/json-schema/DeleteFeaturesCommand.schema.json": DeleteFeaturesCommand,
        "derived/json-schema/SetFeatureCollectionCommand.schema.json": SetFeatureCollectionCommand,
        "derived/json-schema/ShowTextCommand.schema.json": ShowTextCommand,
        "derived/json-schema/ShowDataCommand.schema.json": ShowDataCommand,
        "derived/json-schema/ShowImageCommand.schema.json": ShowImageCommand,
        "derived/json-schema/LogMessageCommand.schema.json": LogMessageCommand,
        "derived/json-schema/LogMessagePayload.schema.json": LogMessagePayload,
    }

    print("Generating JSON Schema files from Pydantic models...")
    for output_path, model_class in models.items():
        generate_json_schema(model_class, Path(output_path))

    print("JSON Schema generation complete!")


if __name__ == "__main__":
    main()