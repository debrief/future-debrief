"""Tool Pydantic model for maritime analysis tool definitions."""

from pydantic import BaseModel, Field
from typing import Optional
from .json_schema import JSONSchema


class Tool(BaseModel):
    """A tool definition with an input schema for maritime analysis."""

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
    tool_url: Optional[str] = Field(
        None,
        description="Optional URL for SPA navigation to tool details"
    )

    class Config:
        extra = "forbid"  # No additional properties
