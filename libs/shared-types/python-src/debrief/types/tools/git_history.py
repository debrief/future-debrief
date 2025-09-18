"""Git history Pydantic models for tool development tracking."""

from pydantic import BaseModel, Field
from typing import List, Union


class GitAuthor(BaseModel):
    """Git commit author information."""

    name: str = Field(
        ...,
        description="Author's full name"
    )
    email: str = Field(
        ...,
        description="Author's email address"
    )

    class Config:
        extra = "forbid"


class GitHistoryEntry(BaseModel):
    """A single git commit entry in tool development history."""

    hash: str = Field(
        ...,
        description="Git commit hash"
    )
    author: Union[GitAuthor, str] = Field(
        ...,
        description="Commit author information (object or string for backward compatibility)"
    )
    date: str = Field(
        ...,
        description="Commit date in ISO format"
    )
    message: str = Field(
        ...,
        description="Commit message"
    )

    class Config:
        extra = "forbid"


class GitHistory(BaseModel):
    """Collection of git commits for a tool."""

    commits: List[GitHistoryEntry] = Field(
        default_factory=list,
        description="List of git commits in chronological order"
    )

    class Config:
        extra = "forbid"