"""Tool statistics Pydantic models for tool metadata."""

from pydantic import BaseModel, Field


class ToolStatsModel(BaseModel):
    """Statistics about a tool's development and usage."""

    sample_inputs_count: int = Field(
        default=0,
        description="Number of sample input files available for this tool",
        ge=0
    )
    git_commits_count: int = Field(
        default=0,
        description="Number of git commits in this tool's development history",
        ge=0
    )
    source_code_length: int = Field(
        default=0,
        description="Length of the tool's source code in characters",
        ge=0
    )

    class Config:
        extra = "forbid"