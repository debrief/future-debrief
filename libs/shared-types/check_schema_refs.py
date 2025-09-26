#!/usr/bin/env python3
"""
Check for missing schema references and create stub files if needed.
"""

import json
import os
from pathlib import Path

def find_missing_refs():
    """Find all schema references that point to non-existent files."""
    schema_dir = Path("derived/json-schema")
    missing_refs = set()

    if not schema_dir.exists():
        print("No schema directory found")
        return missing_refs

    # Scan all JSON schema files
    for schema_file in schema_dir.rglob("*.json"):
        try:
            with open(schema_file) as f:
                schema = json.load(f)

            # Look for $ref properties
            refs = find_refs_in_object(schema)
            for ref in refs:
                if ref.startswith("./") or ref.startswith("../"):
                    # Resolve relative path
                    ref_path = (schema_file.parent / ref).resolve()
                    if not ref_path.exists():
                        missing_refs.add(str(ref_path.relative_to(Path.cwd())))

        except (json.JSONDecodeError, Exception) as e:
            print(f"Error reading {schema_file}: {e}")

    return missing_refs

def find_refs_in_object(obj):
    """Recursively find all $ref values in a JSON object."""
    refs = []

    if isinstance(obj, dict):
        if "$ref" in obj:
            refs.append(obj["$ref"])
        for value in obj.values():
            refs.extend(find_refs_in_object(value))
    elif isinstance(obj, list):
        for item in obj:
            refs.extend(find_refs_in_object(item))

    return refs

def create_stub_schema(file_path, title):
    """Create a minimal stub schema file."""
    stub_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": f"#{title}",
        "title": title,
        "type": "object",
        "additionalProperties": True,
        "description": f"Stub schema for {title} - auto-generated"
    }

    # Ensure directory exists
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)

    with open(file_path, 'w') as f:
        json.dump(stub_schema, f, indent=2)

    print(f"Created stub schema: {file_path}")

if __name__ == "__main__":
    print("Checking for missing schema references...")
    missing_refs = find_missing_refs()

    if missing_refs:
        print(f"Found {len(missing_refs)} missing references:")
        for ref in sorted(missing_refs):
            print(f"  {ref}")

            # Create stub files for all missing references
            title = Path(ref).stem.replace(".schema", "")
            create_stub_schema(ref, title)
    else:
        print("No missing references found!")