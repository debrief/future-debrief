"""FeatureCollection Pydantic model for maritime GeoJSON data."""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Union

from .track import DebriefTrackFeature
from .point import DebriefPointFeature
from .annotation import DebriefAnnotationFeature


class FeatureCollectionProperties(BaseModel):
    """Properties for FeatureCollection."""
    name: Optional[str] = Field(
        None,
        description="Human readable name for this collection"
    )
    description: Optional[str] = Field(
        None,
        description="Description of this feature collection"
    )
    created: Optional[datetime] = Field(
        None,
        description="When this collection was created"
    )
    modified: Optional[datetime] = Field(
        None,
        description="When this collection was last modified"
    )
    version: Optional[str] = Field(
        None,
        description="Version of this collection"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefFeatureCollection(BaseModel):
    """A GeoJSON FeatureCollection containing mixed feature types for maritime analysis."""

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[Union[DebriefTrackFeature, DebriefPointFeature, DebriefAnnotationFeature]] = Field(
        ...,
        description="Array of Debrief features"
    )
    bbox: Optional[List[float]] = Field(
        None,
        min_length=4,
        max_length=6,
        description="Bounding box of the feature collection"
    )
    properties: Optional[FeatureCollectionProperties] = None

    class Config:
        extra = "forbid"  # No additional properties at top level