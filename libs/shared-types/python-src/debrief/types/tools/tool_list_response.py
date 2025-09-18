"""ToolListResponse Pydantic model for listing available tools."""

from pydantic import BaseModel, Field
from typing import List, Optional
from .tool import Tool


class ToolListResponse(BaseModel):
    """Response format for listing available tools."""

    tools: List[Tool] = Field(
        ...,
        description="Array of available tools"
    )
    version: Optional[str] = Field(
        None,
        description="Optional version identifier for the tool collection"
    )
    description: Optional[str] = Field(
        None,
        description="Optional description of the tool collection"
    )

    class Config:
        extra = "forbid"  # No additional properties