"""ToolCategory Pydantic model for hierarchical tool organization."""

from pydantic import BaseModel, Field
from typing import List, Literal, TYPE_CHECKING

if TYPE_CHECKING:
    from .tool_index_node import ToolIndexNode


class ToolCategory(BaseModel):
    """A category node containing tools and/or subcategories."""

    type: Literal["category"] = "category"
    name: str = Field(
        ...,
        description="Category name (from folder name)"
    )
    children: List['ToolIndexNode'] = Field(
        ...,
        description="Child nodes - can be tools or subcategories"
    )

    class Config:
        extra = "forbid"
