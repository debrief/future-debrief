#!/usr/bin/env python3
"""
Generate JSON Schema and TypeScript types from Pydantic models.

This script replaces the old JSON Schema -> TypeScript generation
with Pydantic -> JSON Schema & TypeScript generation.
"""

import json
import os
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
)


def generate_json_schemas():
    """Generate JSON Schema files from Pydantic models."""
    output_dir = Path("derived/json-schema")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Define the models and their output file names
    models = {
        # Features
        "Track.schema.json": DebriefTrackFeature,
        "Point.schema.json": DebriefPointFeature,
        "Annotation.schema.json": DebriefAnnotationFeature,
        "FeatureCollection.schema.json": DebriefFeatureCollection,

        # States
        "TimeState.schema.json": TimeState,
        "ViewportState.schema.json": ViewportState,
        "SelectionState.schema.json": SelectionState,
        "EditorState.schema.json": EditorState,
        "CurrentState.schema.json": CurrentState,
    }

    print("Generating JSON Schema files...")
    for filename, model_class in models.items():
        schema = model_class.model_json_schema()
        output_path = output_dir / filename

        with open(output_path, 'w') as f:
            json.dump(schema, f, indent=2)

        print(f"Generated: {output_path}")


def generate_typescript_types():
    """Generate TypeScript types from Pydantic models using pydantic-to-typescript."""
    print("Warning: Using manual TypeScript generation via json-schema-to-typescript")
    generate_typescript_manual()


def generate_typescript_manual():
    """Manually generate TypeScript using json-schema-to-typescript on generated schemas."""
    import subprocess

    output_dir = Path("derived/typescript")
    schema_dir = Path("derived/json-schema")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Generating TypeScript types using json-schema-to-typescript...")

    for schema_file in schema_dir.glob("*.json"):
        ts_filename = schema_file.stem.replace('.schema', '') + '.ts'
        output_path = output_dir / ts_filename

        cmd = [
            "npx", "json-schema-to-typescript",
            str(schema_file),
            "--output", str(output_path)
        ]

        try:
            subprocess.run(cmd, check=True, cwd=Path.cwd())
            print(f"Generated: {output_path}")
        except subprocess.CalledProcessError as e:
            print(f"Error generating {output_path}: {e}")


def main():
    """Main generation function."""
    print("Starting Pydantic-based type generation...")

    # Generate JSON Schema files from Pydantic models
    generate_json_schemas()

    # Generate TypeScript types from Pydantic models
    generate_typescript_types()

    # Copy to traditional src/types location for compatibility
    print("Copying TypeScript files to src/types for compatibility...")
    import shutil
    src_types_dir = Path("src/types")
    src_types_dir.mkdir(parents=True, exist_ok=True)

    ts_output_dir = Path("derived/typescript")
    for ts_file in ts_output_dir.glob("*.ts"):
        shutil.copy2(ts_file, src_types_dir / ts_file.name)
        print(f"Copied: {ts_file.name} -> src/types/")

    print("Generation complete!")


if __name__ == "__main__":
    main()