"""Global tool index Pydantic models for package-level index.json files."""

from pydantic import BaseModel, Field
from typing import List, Optional
from .tool import Tool


class PackageInfo(BaseModel):
    """Package build and metadata information."""

    buildDate: str = Field(
        ...,
        description="ISO timestamp when the package was built"
    )
    commit: str = Field(
        ...,
        description="Git commit hash used for the build"
    )
    author: str = Field(
        ...,
        description="Author of the package build"
    )

    class Config:
        extra = "forbid"


class GlobalToolIndexModel(BaseModel):
    """Global index for all tools in a package (replaces generate_index_json() output)."""

    tools: List[Tool] = Field(
        ...,
        description="Array of all available tools in this package"
    )
    version: str = Field(
        ...,
        description="Version identifier for the tool collection"
    )
    description: str = Field(
        ...,
        description="Description of the tool collection"
    )
    packageInfo: Optional[PackageInfo] = Field(
        None,
        description="Optional package build metadata"
    )

    class Config:
        extra = "forbid"