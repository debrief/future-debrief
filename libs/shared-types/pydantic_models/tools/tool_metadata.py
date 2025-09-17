"""Tool metadata Pydantic models for enhanced ToolMetadata class."""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Callable
from .git_history import GitHistoryEntry


class SampleInputData(BaseModel):
    """Sample input data for tool testing."""

    name: str = Field(
        ...,
        description="Display name for the sample input"
    )
    file: str = Field(
        ...,
        description="Filename of the sample input"
    )
    data: Dict[str, Any] = Field(
        ...,
        description="The actual sample input data"
    )

    class Config:
        extra = "forbid"


class ToolMetadataModel(BaseModel):
    """Enhanced ToolMetadata class with typed parameters, sample_inputs, git_history."""

    name: str = Field(
        ...,
        description="The unique identifier/name of the tool"
    )
    description: str = Field(
        ...,
        description="Human-readable description of what the tool does"
    )
    parameters: Dict[str, Any] = Field(
        ...,
        description="Typed parameter schema for the tool"
    )
    return_type: str = Field(
        ...,
        description="Return type annotation as string"
    )
    module_path: str = Field(
        ...,
        description="Path to the tool's module file"
    )
    tool_dir: str = Field(
        ...,
        description="Directory containing the tool"
    )
    sample_inputs: List[SampleInputData] = Field(
        default_factory=list,
        description="Sample input data for testing"
    )
    source_code: Optional[str] = Field(
        None,
        description="Tool's source code"
    )
    git_history: List[GitHistoryEntry] = Field(
        default_factory=list,
        description="Git commit history for this tool"
    )

    class Config:
        extra = "forbid"
        # Note: We exclude 'function', 'module', and 'pydantic_model' from the Pydantic model
        # as these are runtime Python objects that don't serialize to JSON