#!/usr/bin/env python3
"""Copy Pydantic models into python-src for packaging the Python wheel."""

from __future__ import annotations

from pathlib import Path
import shutil
import textwrap

ROOT = Path(__file__).parent
SRC_ROOT = ROOT / "pydantic_models"
DEST_ROOT = ROOT / "python-src" / "debrief" / "types"

INIT_TEMPLATE = textwrap.dedent(
    '''
    """Pydantic-backed Debrief types with backwards compatible aliases."""

    from __future__ import annotations

    from .features import (
        DebriefTrackFeature,
        DebriefPointFeature,
        DebriefAnnotationFeature,
        DebriefFeatureCollection,
    )
    from .states import (
        TimeState,
        ViewportState,
        SelectionState,
        EditorState,
        CurrentState,
    )
    from .tools import (
        JSONSchema,
        Tool,
        ToolCallRequest,
        ToolCallResponse,
        ToolListResponse,
        GeometryConstrainedFeature,
    )

    # Backwards compatible aliases retained for external consumers
    TrackFeature = DebriefTrackFeature
    PointFeature = DebriefPointFeature
    AnnotationFeature = DebriefAnnotationFeature
    FeatureCollection = DebriefFeatureCollection
    ConstrainedFeature = GeometryConstrainedFeature

    __all__ = [
        "TrackFeature",
        "PointFeature",
        "AnnotationFeature",
        "FeatureCollection",
        "TimeState",
        "ViewportState",
        "SelectionState",
        "EditorState",
        "CurrentState",
        "JSONSchema",
        "Tool",
        "ToolCallRequest",
        "ToolCallResponse",
        "ToolListResponse",
        "ConstrainedFeature",
        "DebriefTrackFeature",
        "DebriefPointFeature",
        "DebriefAnnotationFeature",
        "DebriefFeatureCollection",
        "GeometryConstrainedFeature",
    ]
    '''
).strip() + "\n"


def copy_section(section: str) -> None:
    """Copy all Pydantic model files for a given section."""
    src_dir = SRC_ROOT / section
    dest_dir = DEST_ROOT / section
    dest_dir.mkdir(parents=True, exist_ok=True)

    for py_file in src_dir.glob("*.py"):
        shutil.copy2(py_file, dest_dir / py_file.name)


def write_root_init() -> None:
    """Write the aggregated __init__ with public exports and aliases."""
    (DEST_ROOT / "__init__.py").write_text(INIT_TEMPLATE, encoding="utf-8")


def main() -> None:
    """Entry point for copying models and preparing exports."""
    if DEST_ROOT.exists():
        shutil.rmtree(DEST_ROOT)

    for section in ("features", "states", "tools"):
        copy_section(section)

    write_root_init()


if __name__ == "__main__":
    main()
