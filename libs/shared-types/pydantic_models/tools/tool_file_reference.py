"""Tool file reference Pydantic models for file metadata."""

from pydantic import BaseModel, Field
from typing import Literal


class ToolFileReference(BaseModel):
    """Reference to a file within a tool's directory structure."""

    path: str = Field(
        ...,
        description="Relative path to the file within the tool package"
    )
    description: str = Field(
        ...,
        description="Human-readable description of the file's purpose"
    )
    type: Literal["python", "html", "json"] = Field(
        ...,
        description="File type classification"
    )

    class Config:
        extra = "forbid"


class SampleInputReference(ToolFileReference):
    """Reference to a sample input file with additional metadata."""

    name: str = Field(
        ...,
        description="Display name for the sample input"
    )

    class Config:
        extra = "forbid"