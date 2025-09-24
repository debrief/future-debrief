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
    timeStart: Optional[datetime] = Field(
        None,
        description="Start time for a time range"
    )
    timeEnd: Optional[datetime] = Field(
        None,
        description="End time for a time range"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this point"
    )
    description: Optional[str] = Field(
        None,
        description="Additional description or notes for this point"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefPointFeature(Feature[Point, PointProperties]):
    """A GeoJSON Feature representing a point with time properties."""

    @field_validator('geometry')
    @classmethod
    def validate_point_geometry(cls, v):
        """Ensure geometry is Point."""
        if not isinstance(v, Point):
            raise ValueError('Point features must have Point geometry')
        return v
