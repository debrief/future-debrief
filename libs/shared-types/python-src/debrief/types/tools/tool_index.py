"""Tool index Pydantic models for individual tool.json files."""

from pydantic import BaseModel, Field
from typing import List
from .tool_file_reference import ToolFileReference, SampleInputReference
from .tool_stats import ToolStatsModel


class ToolFilesCollection(BaseModel):
    """Collection of files within a tool's directory structure."""

    execute: ToolFileReference = Field(
        ...,
        description="Main tool implementation file"
    )
    source_code: ToolFileReference = Field(
        ...,
        description="Pretty-printed source code file"
    )
    git_history: ToolFileReference = Field(
        ...,
        description="Git commit history file"
    )
    inputs: List[SampleInputReference] = Field(
        default_factory=list,
        description="Sample input files for testing the tool"
    )
    schemas: List[ToolFileReference] = Field(
        default_factory=list,
        description="Generated schema documents associated with this tool"
    )

    class Config:
        extra = "forbid"


class ToolIndexModel(BaseModel):
    """Index data for an individual tool (replaces packager.py:358-399 dictionary structure)."""

    tool_name: str = Field(
        ...,
        description="The name of the tool"
    )
    description: str = Field(
        ...,
        description="Human-readable description of what the tool does"
    )
    files: ToolFilesCollection = Field(
        ...,
        description="Files associated with this tool"
    )
    stats: ToolStatsModel = Field(
        ...,
        description="Statistics about this tool"
    )

    class Config:
        extra = "forbid"
