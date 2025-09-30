"""Zone Pydantic model for maritime zone features."""

from datetime import datetime
from typing import List, Literal, Optional

from geojson_pydantic import Feature, Polygon
from pydantic import BaseModel, Field, field_validator


class ZoneSpecifics(BaseModel):
    """Specifics object for zone shape metadata."""
    shapeType: str = Field(
        ...,
        description="Type of shape (circle, rectangle, polygon, etc.)"
    )
    origin: Optional[List[float]] = Field(
        None,
        description="Origin point [longitude, latitude] for shapes like circles",
        min_length=2,
        max_length=2
    )
    radiusM: Optional[float] = Field(
        None,
        description="Radius in meters for circular zones"
    )

    class Config:
        extra = "allow"  # Allow additional shape-specific properties


class ZoneProperties(BaseModel):
    """Properties for zone features."""
    dataType: Literal["zone"] = Field(
        "zone",
        description="Discriminator to identify this as a zone feature"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this zone"
    )
    stroke: Optional[str] = Field(
        None,
        description="Stroke color (hex color code)"
    )
    fill: Optional[str] = Field(
        None,
        description="Fill color (hex color code)"
    )
    visible: Optional[bool] = Field(
        True,
        description="Whether this zone is visible"
    )
    time: Optional[datetime] = Field(
        None,
        description="Start time for this zone"
    )
    timeEnd: Optional[datetime] = Field(
        None,
        description="End time for this zone"
    )
    specifics: Optional[ZoneSpecifics] = Field(
        None,
        description="Shape-specific metadata (useful for editing)"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefZoneFeature(Feature[Polygon, ZoneProperties]):
    """A GeoJSON Feature representing a maritime zone with polygon geometry."""

    @field_validator('geometry')
    @classmethod
    def validate_zone_geometry(cls, v):
        """Ensure geometry is Polygon."""
        if not isinstance(v, Polygon):
            raise ValueError('Zone features must have Polygon geometry')
        return v