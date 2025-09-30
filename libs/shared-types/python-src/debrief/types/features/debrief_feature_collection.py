"""FeatureCollection Pydantic model for maritime GeoJSON data."""

from datetime import datetime
from pydantic import BaseModel, Discriminator, Field, Tag
from typing import Annotated, List, Literal, Optional, Union

from .track import DebriefTrackFeature
from .point import DebriefPointFeature
from .annotation import DebriefAnnotationFeature
from .metadata import MetadataFeature
from .zone import DebriefZoneFeature
from .buoyfield import DebriefBuoyfieldFeature
from .backdrop import DebriefBackdropFeature


def get_feature_discriminator(v) -> str:
    """Extract dataType from feature properties for discriminated union.

    Handles both plain dicts (during JSON parsing) and BaseModel instances
    (when constructing collections from already-validated models).
    """
    # Handle plain dictionaries (JSON input)
    if isinstance(v, dict) and "properties" in v and isinstance(v["properties"], dict):
        return v["properties"].get("dataType", "unknown")

    # Handle BaseModel instances (already-validated Pydantic models)
    if isinstance(v, BaseModel) and hasattr(v, "properties") and v.properties is not None:
        if hasattr(v.properties, "dataType"):
            return v.properties.dataType

    return "unknown"


# Define DebriefFeature as a discriminated union based on properties.dataType
DebriefFeature = Annotated[
    Union[
        Annotated[DebriefTrackFeature, Tag("track")],
        Annotated[DebriefPointFeature, Tag("reference-point")],
        Annotated[DebriefAnnotationFeature, Tag("annotation")],
        Annotated[MetadataFeature, Tag("metadata")],
        Annotated[DebriefZoneFeature, Tag("zone")],
        Annotated[DebriefBuoyfieldFeature, Tag("buoyfield")],
        Annotated[DebriefBackdropFeature, Tag("backdrop")],
    ],
    Discriminator(get_feature_discriminator),
]


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
    features: List[DebriefFeature] = Field(
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