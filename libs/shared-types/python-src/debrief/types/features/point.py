"""Point Pydantic model for maritime reference point features."""

from datetime import datetime
from typing import Literal, Optional

from geojson_pydantic import Feature, Point
from pydantic import BaseModel, Field, field_validator


# Point geometry is now provided by geojson-pydantic
# Point is imported from geojson_pydantic


class PointProperties(BaseModel):
    """Properties for reference point features."""
    dataType: Literal["reference-point"] = Field(
        "reference-point",
        description="Discriminator to identify this as a reference point feature"
    )
    time: Optional[datetime] = Field(
        None,
        description="Single timestamp for this point"
    )
    timeEnd: Optional[datetime] = Field(
        None,
        description="End time for a time range"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this point"
    )
    visible: Optional[bool] = Field(
        True,
        description="Whether this point is visible"
    )
    marker_color: Optional[str] = Field(
        None,
        alias="marker-color",
        description="Marker color (hex color code)"
    )

    class Config:
        extra = "forbid"  # Strict validation - no additional properties
        populate_by_name = True  # Allow both marker_color and marker-color


class DebriefPointFeature(Feature[Point, PointProperties]):
    """A GeoJSON Feature representing a point with time properties."""

    class Config:
        extra = "forbid"  # Strict validation - no additional properties

    @field_validator('geometry')
    @classmethod
    def validate_point_geometry(cls, v):
        """Ensure geometry is Point."""
        if not isinstance(v, Point):
            raise ValueError('Point features must have Point geometry')
        return v
