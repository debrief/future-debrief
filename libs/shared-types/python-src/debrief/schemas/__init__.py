"""
JSON schemas for Debrief maritime GeoJSON features and application state.

This module provides access to all JSON schemas used for validation:
- Maritime GeoJSON feature schemas
- Application state schemas  
- Helper functions to load schemas

The schemas are bundled with the package for offline validation.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Path to the schemas directory
SCHEMAS_DIR = Path(__file__).parent

def get_schema(schema_name: str) -> Optional[Dict[Any, Any]]:
    """
    Load a JSON schema by name.
    
    Args:
        schema_name: Name of the schema file (without .json extension)
        
    Returns:
        Dict containing the JSON schema, or None if not found
    """
    schema_path = SCHEMAS_DIR / f"{schema_name}.json"
    if schema_path.exists():
        with open(schema_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def list_schemas() -> list[str]:
    """
    List all available schema names.
    
    Returns:
        List of schema names (without .json extension)
    """
    return [f.stem for f in SCHEMAS_DIR.glob("*.json")]

# Convenience functions for common schemas
def get_track_schema() -> Optional[Dict[Any, Any]]:
    """Get the track feature schema."""
    return get_schema("track.schema")

def get_point_schema() -> Optional[Dict[Any, Any]]:
    """Get the point feature schema."""
    return get_schema("point.schema")

def get_annotation_schema() -> Optional[Dict[Any, Any]]:
    """Get the annotation feature schema."""
    return get_schema("annotation.schema")

def get_featurecollection_schema() -> Optional[Dict[Any, Any]]:
    """Get the feature collection schema."""
    return get_schema("featurecollection.schema")

def get_timestate_schema() -> Optional[Dict[Any, Any]]:
    """Get the time state schema."""
    return get_schema("TimeState")

def get_viewportstate_schema() -> Optional[Dict[Any, Any]]:
    """Get the viewport state schema."""
    return get_schema("ViewportState")

def get_selectionstate_schema() -> Optional[Dict[Any, Any]]:
    """Get the selection state schema."""
    return get_schema("SelectionState")

def get_editorstate_schema() -> Optional[Dict[Any, Any]]:
    """Get the editor state schema."""
    return get_schema("EditorState")

__all__ = [
    'get_schema',
    'list_schemas',
    'get_track_schema',
    'get_point_schema',
    'get_annotation_schema', 
    'get_featurecollection_schema',
    'get_timestate_schema',
    'get_viewportstate_schema',
    'get_selectionstate_schema',
    'get_editorstate_schema',
]