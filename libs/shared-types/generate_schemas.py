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
from typing import Any, Dict
from pydantic.json_schema import GenerateJsonSchema, models_json_schema

# Add python-src to path for new package structure
script_dir = os.path.dirname(os.path.abspath(__file__))
python_src_path = os.path.join(script_dir, "python-src")
sys.path.insert(0, python_src_path)


class ExternalRefJsonSchemaGenerator(GenerateJsonSchema):
    """Custom JSON Schema generator that uses external $refs for known feature types."""

    # Mapping of model names to their schema URLs
    EXTERNAL_REFS = {
        'DebriefTrackFeature': 'https://schemas.debrief.com/features/track-feature.schema.json',
        'DebriefPointFeature': 'https://schemas.debrief.com/features/point-feature.schema.json',
        'DebriefAnnotationFeature': 'https://schemas.debrief.com/features/annotation-feature.schema.json'
    }

    def generate_ref_json_schema(
        self,
        core_schema: Any,
        from_default_factory: bool = False,
        from_property: str = "",
    ) -> Dict[str, Any]:
        """Override to use external refs for known models."""

        # Get the default ref schema
        ref_json_schema = super().generate_ref_json_schema(core_schema, from_default_factory, from_property)

        # Check if this is a reference to a known external schema
        if '$ref' in ref_json_schema:
            ref_key = ref_json_schema['$ref']
            # Extract model name from internal reference like "#/$defs/DebriefTrackFeature"
            if ref_key.startswith('#/$defs/'):
                model_name = ref_key.replace('#/$defs/', '')
                if model_name in self.EXTERNAL_REFS:
                    # Replace with external reference
                    ref_json_schema['$ref'] = self.EXTERNAL_REFS[model_name]

        return ref_json_schema


def generate_json_schema(model_class, output_path, use_external_refs=False):
    """Generate a single JSON Schema file from a Pydantic model."""
    if use_external_refs:
        schema = model_class.model_json_schema(schema_generator=ExternalRefJsonSchemaGenerator)
        # Apply selective reference fixing for GeoJSON geometry types
        fix_schema_references(schema)
    else:
        schema = model_class.model_json_schema()

    # Add appropriate $id fields to GeoJSON schemas so they can be properly referenced
    if "geojson" in str(output_path):
        model_name = model_class.__name__
        schema["$id"] = f"https://schemas.debrief.com/geojson/{model_name}.schema.json"

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(schema, f, indent=2)


def fix_schema_references(schema, class_to_key_mapping=None, group_name=None):
    """Fix $ref references in schema to use our file naming convention and remove duplicated definitions."""
    geojson_types = ["Point", "LineString", "MultiLineString", "Polygon", "MultiPoint", "MultiPolygon"]
    # Position types should also be removed since they belong to GeoJSON geometries
    position_types = ["Position2D", "Position3D"]

    if isinstance(schema, dict):
        # Remove GeoJSON geometry definitions and their position dependencies from $defs
        if "$defs" in schema:
            for geojson_type in geojson_types + position_types:
                if geojson_type in schema["$defs"]:
                    del schema["$defs"][geojson_type]

        if "$ref" in schema:
            ref = schema["$ref"]
            # Handle internal $defs references - only convert GeoJSON geometry types to external refs
            if ref.startswith("#/$defs/"):
                class_name = ref.replace("#/$defs/", "")
                if class_name in geojson_types:
                    # Convert GeoJSON geometry $defs to external references
                    schema["$ref"] = f"../geojson/{class_name}.schema.json"
                # Leave other $defs references unchanged (e.g., TrackProperties, PointProperties, etc.)
            # Handle external ./filename.schema.json references
            elif ref.startswith("./"):
                class_name = ref.replace("./", "").replace(".schema.json", "")
                if class_to_key_mapping and class_name in class_to_key_mapping:
                    # Use relative path within the same folder
                    schema["$ref"] = f"{class_to_key_mapping[class_name]}.schema.json"
                elif class_name in geojson_types:
                    # GeoJSON geometry types - use relative file paths
                    schema["$ref"] = f"../geojson/{class_name}.schema.json"
                # Handle cross-folder references for tools that might reference features or states
                elif group_name == "tools":
                    # Check if it's a feature type
                    if class_name in ["DebriefTrackFeature", "DebriefPointFeature", "DebriefAnnotationFeature", "DebriefFeatureCollection"]:
                        feature_mapping = {
                            "DebriefTrackFeature": "track",
                            "DebriefPointFeature": "point",
                            "DebriefAnnotationFeature": "annotation",
                            "DebriefFeatureCollection": "debrief_feature_collection"
                        }
                        schema["$ref"] = f"../features/{feature_mapping[class_name]}.schema.json"
                    # Check if it's a state type
                    elif class_name in ["TimeState", "ViewportState", "SelectionState", "EditorState", "CurrentState"]:
                        state_mapping = {
                            "TimeState": "time_state",
                            "ViewportState": "viewport_state",
                            "SelectionState": "selection_state",
                            "EditorState": "editor_state",
                            "CurrentState": "current_state"
                        }
                        schema["$ref"] = f"../states/{state_mapping[class_name]}.schema.json"

        # Recursively fix references in nested objects
        for key, value in schema.items():
            if key != "$ref":
                schema[key] = fix_schema_references(value, class_to_key_mapping, group_name)

    elif isinstance(schema, list):
        # Recursively fix references in lists
        schema = [fix_schema_references(item, class_to_key_mapping, group_name) for item in schema]

    return schema


def generate_unified_schemas(model_groups, output_dir):
    """Generate unified schemas for related model groups using models_json_schema()."""
    for group_name, models_info in model_groups.items():
        model_specs = models_info['models']  # List of (model_class, model_key)
        ref_template = models_info['ref_template']

        # Convert to format expected by models_json_schema: (model, mode)
        models_list = [(model_class, 'validation') for model_class, _ in model_specs]

        # Generate unified schema with external references
        schemas_map, definitions_schema = models_json_schema(models_list, ref_template=ref_template)

        # Create a mapping from class names to our desired file names
        class_to_key_mapping = {model_class.__name__: key for model_class, key in model_specs}

        # Generate individual schema files from the definitions
        if '$defs' in definitions_schema:
            for model_name, schema_def in definitions_schema['$defs'].items():
                # Find the corresponding model key for this model
                if model_name in class_to_key_mapping:
                    model_key = class_to_key_mapping[model_name]
                    output_path = output_dir / f"{group_name}/{model_key}.schema.json"

                    # Ensure output directory exists
                    output_path.parent.mkdir(parents=True, exist_ok=True)

                    # Add the individual schema without $id to avoid reference resolution issues
                    # The post-processing script will add $id fields where needed
                    individual_schema = schema_def.copy()

                    # Fix internal references to use our file naming convention
                    individual_schema = fix_schema_references(individual_schema, class_to_key_mapping, group_name)

                    with open(output_path, 'w') as f:
                        json.dump(individual_schema, f, indent=2)

                    print(f"Generated {output_path} with external refs")


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

    output_dir = Path("derived/json-schema")

    # Define model groups that should use unified schema generation with external refs
    unified_model_groups = {
        "states": {
            "models": [
                (TimeState, "time_state"),
                (ViewportState, "viewport_state"),
                (SelectionState, "selection_state"),
                (EditorState, "editor_state"),
                (CurrentState, "current_state"),
            ],
            "ref_template": "./{model}.schema.json"
        },
        "tools": {
            "models": [
                # Core tool types
                (JSONSchema, "json_schema"),
                (Tool, "tool"),
                (ToolCallRequest, "tool_call_request"),
                (ToolCallResponse, "tool_call_response"),
                (ToolListResponse, "tool_list_response"),
                (GeometryConstrainedFeature, "constrained_feature"),
                (ToolFileReference, "tool_file_reference"),
                (SampleInputReference, "sample_input_reference"),

                # Git history types
                (GitHistoryEntry, "git_history_entry"),
                (GitAuthor, "git_author"),
                (GitHistory, "git_history"),

                # Tool management types
                (ToolStatsModel, "tool_stats"),
                (ToolIndexModel, "tool_index"),
                (ToolFilesCollection, "tool_files_collection"),
                (GlobalToolIndexModel, "global_tool_index"),
                (PackageInfo, "package_info"),
                (ToolMetadataModel, "tool_metadata"),
                (SampleInputData, "sample_input_data"),

                # Command types
                (AddFeaturesCommand, "add_features_command"),
                (UpdateFeaturesCommand, "update_features_command"),
                (DeleteFeaturesCommand, "delete_features_command"),
                (SetFeatureCollectionCommand, "set_feature_collection_command"),
                (SetViewportCommand, "set_viewport_command"),
                (SetSelectionCommand, "set_selection_command"),
                (ShowTextCommand, "show_text_command"),
                (ShowDataCommand, "show_data_command"),
                (ShowImageCommand, "show_image_command"),
                (LogMessageCommand, "log_message_command"),
                (LogMessagePayload, "log_message_payload"),
            ],
            "ref_template": "./{model}.schema.json"
        }
    }

    # Individual models that don't need unified generation
    individual_models = {
        # Base GeoJSON types from geojson-pydantic (excluding GeometryCollection due to circular refs)
        "derived/json-schema/geojson/Feature.schema.json": Feature,
        "derived/json-schema/geojson/FeatureCollection.schema.json": FeatureCollection,
        "derived/json-schema/geojson/Point.schema.json": Point,
        "derived/json-schema/geojson/LineString.schema.json": LineString,
        "derived/json-schema/geojson/MultiLineString.schema.json": MultiLineString,
        "derived/json-schema/geojson/Polygon.schema.json": Polygon,
        "derived/json-schema/geojson/MultiPoint.schema.json": MultiPoint,
        "derived/json-schema/geojson/MultiPolygon.schema.json": MultiPolygon,
    }

    # Feature models that need external refs but preserve internal $defs
    feature_models = {
        "derived/json-schema/features/track.schema.json": DebriefTrackFeature,
        "derived/json-schema/features/point.schema.json": DebriefPointFeature,
        "derived/json-schema/features/annotation.schema.json": DebriefAnnotationFeature,
        "derived/json-schema/features/debrief_feature_collection.schema.json": DebriefFeatureCollection,
    }

    print("Generating JSON Schema files from Pydantic models...")

    # Generate unified schemas with external references
    print("Generating unified schemas with external references...")
    generate_unified_schemas(unified_model_groups, output_dir)

    # Generate feature schemas with external refs for GeoJSON but preserve internal $defs
    print("Generating feature schemas with selective external refs...")
    for output_path, model_class in feature_models.items():
        generate_json_schema(model_class, Path(output_path), use_external_refs=True)

    # Generate individual schemas (mostly geojson types)
    print("Generating individual schemas...")
    for output_path, model_class in individual_models.items():
        generate_json_schema(model_class, Path(output_path))

    # Generate a reusable DebriefFeature schema for the union type
    print("Generating DebriefFeature union schema...")
    debrief_feature_schema = {
        "$id": "https://schemas.debrief.com/features/debrief-feature.schema.json",
        "title": "DebriefFeature",
        "description": "Union type for any Debrief feature (track, point, or annotation)",
        "anyOf": [
            {"$ref": "track-feature.schema.json"},
            {"$ref": "point-feature.schema.json"},
            {"$ref": "annotation-feature.schema.json"}
        ]
    }

    debrief_feature_path = output_dir / "features" / "debrief_feature.schema.json"
    debrief_feature_path.parent.mkdir(parents=True, exist_ok=True)
    with open(debrief_feature_path, 'w') as f:
        json.dump(debrief_feature_schema, f, indent=2)

    print("JSON Schema generation complete!")


if __name__ == "__main__":
    main()
