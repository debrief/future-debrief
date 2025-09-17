"""Point Pydantic model for maritime reference point features."""

from datetime import datetime
from pydantic import BaseModel, Field, validator
from typing import List, Union, Literal, Optional


class PointGeometry(BaseModel):
    """Point geometry for reference point features."""
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="Coordinate position [longitude, latitude, elevation?]"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        """Validate coordinate array structure."""
        if len(v) < 2 or len(v) > 3:
            raise ValueError('Coordinates must have 2 or 3 elements (lon, lat, [elevation])')
        return v


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


class DebriefPointFeature(BaseModel):
    """A GeoJSON Feature representing a point with time properties."""

    type: Literal["Feature"] = "Feature"
    id: Union[str, int] = Field(
        ...,
        description="Unique identifier for this feature"
    )
    geometry: PointGeometry
    properties: PointProperties

    class Config:
        extra = "forbid"  # No additional properties at top level