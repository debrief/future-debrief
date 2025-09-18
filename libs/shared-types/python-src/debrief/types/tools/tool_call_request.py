"""ToolCallRequest Pydantic model for tool execution requests."""

from pydantic import BaseModel, Field
from typing import Any, List


class ToolArgument(BaseModel):
    """Individual tool argument with name and value."""

    name: str = Field(
        ...,
        description="The parameter name"
    )
    value: Any = Field(
        ...,
        description="The parameter value (accepts any type)"
    )

    class Config:
        extra = "forbid"  # No additional properties


class ToolCallRequest(BaseModel):
    """Request model for tool call endpoint matching current Pydantic implementation."""

    name: str = Field(
        ...,
        description="The name of the tool to call"
    )
    arguments: List[ToolArgument] = Field(
        ...,
        description="Tool arguments as an array of named parameters"
    )

    class Config:
        extra = "forbid"  # No additional properties