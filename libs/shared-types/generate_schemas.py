#!/usr/bin/env python3
"""
Generate JSON Schema files from Pydantic models.

This script focuses solely on JSON Schema generation from Pydantic models.
All other build logic (TypeScript generation, file copying, etc.) is handled by the Makefile.
"""

import json
import sys
from pathlib import Path

# Add pydantic_models to path
sys.path.insert(0, str(Path(__file__).parent))

from pydantic_models import (
    DebriefTrackFeature,
    DebriefPointFeature,
    DebriefAnnotationFeature,
    DebriefFeatureCollection,
    TimeState,
    ViewportState,
    SelectionState,
    EditorState,
    CurrentState,
    JSONSchema,
    Tool,
    ToolCallRequest,
    ToolCallResponse,
    ToolListResponse,
    GeometryConstrainedFeature,
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

        # Tools
        "derived/json-schema/JSONSchema.schema.json": JSONSchema,
        "derived/json-schema/Tool.schema.json": Tool,
        "derived/json-schema/ToolCallRequest.schema.json": ToolCallRequest,
        "derived/json-schema/ToolCallResponse.schema.json": ToolCallResponse,
        "derived/json-schema/ToolListResponse.schema.json": ToolListResponse,
        "derived/json-schema/ConstrainedFeature.schema.json": GeometryConstrainedFeature,
    }

    print("Generating JSON Schema files from Pydantic models...")
    for output_path, model_class in models.items():
        generate_json_schema(model_class, Path(output_path))

    print("JSON Schema generation complete!")


if __name__ == "__main__":
    main()