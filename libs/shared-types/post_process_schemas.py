#!/usr/bin/env python3
"""
Post-process JSON schemas to replace inline definitions with external references.
This reduces duplication and enables proper cross-schema references.
"""

import json
import os
from pathlib import Path


def load_schema(schema_path):
    """Load a JSON schema from file."""
    with open(schema_path, 'r') as f:
        return json.load(f)


def save_schema(schema, schema_path):
    """Save a JSON schema to file."""
    with open(schema_path, 'w') as f:
        json.dump(schema, f, indent=2)


def add_schema_ids():
    """Add $id fields to individual schema files so they can be referenced."""
    schema_dir = Path("derived/json-schema")

    # Mapping of schema files to their intended IDs
    schema_ids = {
        "features/track.schema.json": "https://schemas.debrief.com/features/track-feature.schema.json",
        "features/point.schema.json": "https://schemas.debrief.com/features/point-feature.schema.json",
        "features/annotation.schema.json": "https://schemas.debrief.com/features/annotation-feature.schema.json",
    }

    for schema_file, schema_id in schema_ids.items():
        schema_path = schema_dir / schema_file
        if schema_path.exists():
            schema = load_schema(schema_path)
            schema["$id"] = schema_id
            save_schema(schema, schema_path)
            print(f"Added $id to {schema_file}")


def replace_inline_definitions():
    """Replace inline $defs with external $refs in feature collection schema."""
    schema_dir = Path("derived/json-schema")
    fc_schema_path = schema_dir / "features/debrief_feature_collection.schema.json"

    if not fc_schema_path.exists():
        print(f"Feature collection schema not found: {fc_schema_path}")
        return

    schema = load_schema(fc_schema_path)

    # Mapping of inline definitions to external references
    external_refs = {
        "DebriefTrackFeature": "https://schemas.debrief.com/features/track-feature.schema.json",
        "DebriefPointFeature": "https://schemas.debrief.com/features/point-feature.schema.json",
        "DebriefAnnotationFeature": "https://schemas.debrief.com/features/annotation-feature.schema.json"
    }

    # Replace inline definitions with external references in the features array
    if "properties" in schema and "features" in schema["properties"]:
        features_def = schema["properties"]["features"]
        if "items" in features_def and "anyOf" in features_def["items"]:
            # Replace each $ref in the anyOf list
            for item in features_def["items"]["anyOf"]:
                if "$ref" in item:
                    ref_key = item["$ref"].replace("#/$defs/", "")
                    if ref_key in external_refs:
                        item["$ref"] = external_refs[ref_key]
                        print(f"Replaced {ref_key} with external reference")

    # Remove the now-unused definitions from $defs
    if "$defs" in schema:
        for key in list(external_refs.keys()):
            if key in schema["$defs"]:
                del schema["$defs"][key]
                print(f"Removed inline definition for {key}")

    save_schema(schema, fc_schema_path)
    print(f"Updated feature collection schema")


def main():
    """Main post-processing function."""
    print("Post-processing JSON schemas...")

    # Step 1: Add $id fields to individual schemas
    add_schema_ids()

    # Step 2: Replace inline definitions with external references
    replace_inline_definitions()

    print("Schema post-processing complete!")


if __name__ == "__main__":
    main()