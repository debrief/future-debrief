"""ToolIndexNode union type for tree-based tool organization."""

from typing import Union
from .tool import Tool
from .tool_category import ToolCategory

# Discriminated union for tree nodes
ToolIndexNode = Union[Tool, ToolCategory]

# Update forward references to resolve circular dependency
ToolCategory.model_rebuild()
