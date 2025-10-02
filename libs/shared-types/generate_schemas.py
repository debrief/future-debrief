#!/usr/bin/env python3
"""
Generate JSON Schema files from Pydantic models.

This script focuses solely on JSON Schema generation from Pydantic models.
All other build logic (TypeScript generation, file copying, etc.) is handled by the Makefile.
"""

import json
import os
import sys
from pathlib import Path

# Add python-src to path for new package structure
script_dir = os.path.dirname(os.path.abspath(__file__))
python_src_path = os.path.join(script_dir, "python-src")
sys.path.insert(0, python_src_path)


def generate_json_schema(model_class, output_path):
    """Generate a single JSON Schema file from a Pydantic model."""
    schema = model_class.model_json_schema()

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(schema, f, indent=2)


def main():
    """Generate all JSON Schema files from Pydantic models."""
    from geojson_pydantic import (
        Feature,
        FeatureCollection,
        LineString,
        MultiLineString,
        MultiPoint,
        MultiPolygon,
        Point,
        Polygon,
    )

    from debrief.types.features.annotation import DebriefAnnotationFeature
    from debrief.types.features.debrief_feature_collection import (
        DebriefFeatureCollection,
    )
    from debrief.types.features.point import DebriefPointFeature
    from debrief.types.features.track import DebriefTrackFeature
    from debrief.types.features.metadata import (
        ViewportMetadataFeature,
        TimeMetadataFeature,
        SelectionMetadataFeature,
    )
    from debrief.types.features.buoyfield import DebriefBuoyfieldFeature
    from debrief.types.features.backdrop import DebriefBackdropFeature
    from debrief.types.states.current_state import CurrentState
    from debrief.types.states.editor_state import EditorState
    from debrief.types.states.selection_state import SelectionState
    from debrief.types.states.time_state import TimeState
    from debrief.types.states.viewport_state import ViewportState
    from debrief.types.tools.commands import (
        AddFeaturesCommand,
        DeleteFeaturesCommand,
        LogMessageCommand,
        LogMessagePayload,
        SetFeatureCollectionCommand,
        SetSelectionCommand,
        SetViewportCommand,
        ShowDataCommand,
        ShowImageCommand,
        ShowTextCommand,
        UpdateFeaturesCommand,
    )
    from debrief.types.tools.constrained_feature import GeometryConstrainedFeature
    from debrief.types.tools.git_history import GitAuthor, GitHistory, GitHistoryEntry
    from debrief.types.tools.global_tool_index import GlobalToolIndexModel, PackageInfo
    from debrief.types.tools.json_schema import JSONSchema
    from debrief.types.tools.tool import Tool
    from debrief.types.tools.tool_call_request import ToolCallRequest
    from debrief.types.tools.tool_call_response import ToolCallResponse
    from debrief.types.tools.tool_file_reference import (
        SampleInputReference,
        ToolFileReference,
    )
    from debrief.types.tools.tool_index import ToolFilesCollection, ToolIndexModel
    from debrief.types.tools.tool_list_response import ToolListResponse
    from debrief.types.tools.tool_metadata import SampleInputData, ToolMetadataModel
    from debrief.types.tools.tool_stats import ToolStatsModel

    # Define the models and their output file names
    models = {
        # Base GeoJSON types from geojson-pydantic (excluding GeometryCollection due to circular refs)
        "derived/json-schema/geojson/Feature.schema.json": Feature,
        "derived/json-schema/geojson/FeatureCollection.schema.json": FeatureCollection,
        "derived/json-schema/geojson/Point.schema.json": Point,
        "derived/json-schema/geojson/LineString.schema.json": LineString,
        "derived/json-schema/geojson/MultiLineString.schema.json": MultiLineString,
        "derived/json-schema/geojson/Polygon.schema.json": Polygon,
        "derived/json-schema/geojson/MultiPoint.schema.json": MultiPoint,
        "derived/json-schema/geojson/MultiPolygon.schema.json": MultiPolygon,
        # Note: GeometryCollection excluded due to circular reference issues with json-schema-to-typescript

        # Features (matching python-src/debrief/types/features/ structure)
        "derived/json-schema/features/track.schema.json": DebriefTrackFeature,
        "derived/json-schema/features/point.schema.json": DebriefPointFeature,
        "derived/json-schema/features/annotation.schema.json": DebriefAnnotationFeature,
        "derived/json-schema/features/metadata_viewport.schema.json": ViewportMetadataFeature,
        "derived/json-schema/features/metadata_time.schema.json": TimeMetadataFeature,
        "derived/json-schema/features/metadata_selection.schema.json": SelectionMetadataFeature,
        "derived/json-schema/features/buoyfield.schema.json": DebriefBuoyfieldFeature,
        "derived/json-schema/features/backdrop.schema.json": DebriefBackdropFeature,
        "derived/json-schema/features/debrief_feature_collection.schema.json": DebriefFeatureCollection,

        # States (matching python-src/debrief/types/states/ structure)
        "derived/json-schema/states/time_state.schema.json": TimeState,
        "derived/json-schema/states/viewport_state.schema.json": ViewportState,
        "derived/json-schema/states/selection_state.schema.json": SelectionState,
        "derived/json-schema/states/editor_state.schema.json": EditorState,
        "derived/json-schema/states/current_state.schema.json": CurrentState,

        # Tools (matching python-src/debrief/types/tools/ structure)
        "derived/json-schema/tools/json_schema.schema.json": JSONSchema,
        "derived/json-schema/tools/tool.schema.json": Tool,
        "derived/json-schema/tools/tool_call_request.schema.json": ToolCallRequest,
        "derived/json-schema/tools/tool_call_response.schema.json": ToolCallResponse,
        "derived/json-schema/tools/tool_list_response.schema.json": ToolListResponse,
        "derived/json-schema/tools/constrained_feature.schema.json": GeometryConstrainedFeature,
        "derived/json-schema/tools/tool_file_reference.schema.json": ToolFileReference,
        "derived/json-schema/tools/sample_input_reference.schema.json": SampleInputReference,
        "derived/json-schema/tools/git_history_entry.schema.json": GitHistoryEntry,
        "derived/json-schema/tools/git_author.schema.json": GitAuthor,
        "derived/json-schema/tools/git_history.schema.json": GitHistory,
        "derived/json-schema/tools/tool_stats.schema.json": ToolStatsModel,
        "derived/json-schema/tools/tool_index.schema.json": ToolIndexModel,
        "derived/json-schema/tools/tool_files_collection.schema.json": ToolFilesCollection,
        "derived/json-schema/tools/global_tool_index.schema.json": GlobalToolIndexModel,
        "derived/json-schema/tools/package_info.schema.json": PackageInfo,
        "derived/json-schema/tools/tool_metadata.schema.json": ToolMetadataModel,
        "derived/json-schema/tools/sample_input_data.schema.json": SampleInputData,
        "derived/json-schema/tools/add_features_command.schema.json": AddFeaturesCommand,
        "derived/json-schema/tools/update_features_command.schema.json": UpdateFeaturesCommand,
        "derived/json-schema/tools/delete_features_command.schema.json": DeleteFeaturesCommand,
        "derived/json-schema/tools/set_feature_collection_command.schema.json": SetFeatureCollectionCommand,
        "derived/json-schema/tools/set_viewport_command.schema.json": SetViewportCommand,
        "derived/json-schema/tools/set_selection_command.schema.json": SetSelectionCommand,
        "derived/json-schema/tools/show_text_command.schema.json": ShowTextCommand,
        "derived/json-schema/tools/show_data_command.schema.json": ShowDataCommand,
        "derived/json-schema/tools/show_image_command.schema.json": ShowImageCommand,
        "derived/json-schema/tools/log_message_command.schema.json": LogMessageCommand,
        "derived/json-schema/tools/log_message_payload.schema.json": LogMessagePayload,
    }

    print("Generating JSON Schema files from Pydantic models...")
    for output_path, model_class in models.items():
        generate_json_schema(model_class, Path(output_path))

    print("JSON Schema generation complete!")


if __name__ == "__main__":
    main()
