#!/usr/bin/env python3
"""Fix imports and Schema references in generated Python files for CI compatibility."""

import sys
import os
import glob
import re

def fix_editor_state(filepath):
    """Fix EditorState.py imports and Schema references."""
    print(f"Fixing {filepath}")

    with open(filepath, 'r') as f:
        content = f.read()

    # Fix imports - replace multi-line import blocks with specific imports
    content = re.sub(
        r'from \.\.features import \(\s*Annotation,\s*FeatureCollection,\s*Point,\s*Track,\s*\)',
        'from ..features.Annotation import AnnotationFeature\nfrom ..features.FeatureCollection import DebriefFeatureCollection\nfrom ..features.Point import PointFeature\nfrom ..features.Track import TrackFeature',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    content = re.sub(
        r'from \. import \(\s*SelectionState,\s*TimeState,\s*ViewportState,\s*\)',
        'from .SelectionState import SelectionState\nfrom .TimeState import TimeState\nfrom .ViewportState import ViewportState',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Fix Schema references
    content = content.replace('FeatureCollection.Schema', 'DebriefFeatureCollection')
    content = content.replace('TimeState.Schema', 'TimeState')
    content = content.replace('ViewportState.Schema', 'ViewportState')
    content = content.replace('SelectionState.Schema', 'SelectionState')
    content = content.replace('EditorState.Schema', 'EditorState')
    content = content.replace('Track.Schema', 'TrackFeature')
    content = content.replace('Point.Schema', 'PointFeature')
    content = content.replace('Annotation.Schema', 'AnnotationFeature')

    with open(filepath, 'w') as f:
        f.write(content)

def fix_current_state(filepath):
    """Fix CurrentState.py imports and Schema references."""
    print(f"Fixing {filepath}")

    with open(filepath, 'r') as f:
        content = f.read()

    # Fix the specific problematic import where EditorState is imported from features
    content = re.sub(
        r'from \.\.features import Annotation, EditorState, Point, Track',
        'from ..features.Annotation import AnnotationFeature\nfrom ..features.Point import PointFeature\nfrom ..features.Track import TrackFeature\nfrom .EditorState import EditorState',
        content
    )

    # Fix other import patterns
    content = re.sub(
        r'from \.\.features import \(\s*Annotation,\s*Point,\s*Track\s*\)',
        'from ..features.Annotation import AnnotationFeature\nfrom ..features.Point import PointFeature\nfrom ..features.Track import TrackFeature',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Fix Schema references
    content = content.replace('EditorState.Schema', 'EditorState')
    content = content.replace('Track.Schema', 'TrackFeature')
    content = content.replace('Point.Schema', 'PointFeature')
    content = content.replace('Annotation.Schema', 'AnnotationFeature')

    with open(filepath, 'w') as f:
        f.write(content)

def main():
    if len(sys.argv) != 2:
        print("Usage: fix_generated_imports.py <python_types_directory>")
        sys.exit(1)

    base_dir = sys.argv[1]

    # Fix EditorState.py
    editor_state_path = os.path.join(base_dir, "states", "EditorState.py")
    if os.path.exists(editor_state_path):
        fix_editor_state(editor_state_path)

    # Fix CurrentState.py
    current_state_path = os.path.join(base_dir, "states", "CurrentState.py")
    if os.path.exists(current_state_path):
        fix_current_state(current_state_path)

    print("Import fixes completed")

if __name__ == '__main__':
    main()