"""Tool Pydantic model for maritime analysis tool definitions."""

from pydantic import BaseModel, Field
from typing import Optional
from .json_schema import JSONSchema


class Tool(BaseModel):
    """A tool definition with input/output schemas for maritime analysis."""

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

    class Config:
        extra = "forbid"  # No additional properties