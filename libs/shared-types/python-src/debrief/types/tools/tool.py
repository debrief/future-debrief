"""Tool Pydantic model for maritime analysis tool definitions."""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from .json_schema import JSONSchema


class Tool(BaseModel):
    """A tool definition with input/output schemas for maritime analysis."""

    type: Literal["tool"] = "tool"
    name: str = Field(
        ...,
        description="The unique identifier/name of the tool"
    )
    description: str = Field(
        ...,
        description="Human-readable description of what the tool does"
    )
    inputSchema: JSONSchema = Field(
        ...,
        description="JSON Schema defining the expected input parameters"
    )
    outputSchema: Optional[JSONSchema] = Field(
        None,
        description="Optional JSON Schema defining the expected output format"
    )
    tool_url: Optional[str] = Field(
        None,
        description="Optional URL for SPA navigation to tool details"
    )
    module_path: Optional[str] = Field(
        None,
        description="Python module path for lazy loading (e.g., 'tools.text.word_count.execute')"
    )
    function_name: Optional[str] = Field(
        None,
        description="Function name within the module for execution"
    )

    class Config:
        extra = "forbid"  # No additional properties