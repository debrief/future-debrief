"""Track Pydantic model for maritime track features."""

from datetime import datetime
from pydantic import BaseModel, Field, validator
from typing import List, Union, Literal, Optional, Any, Dict
from enum import Enum


class GeometryType(str, Enum):
    """Geometry types for track features."""
    LINESTRING = "LineString"
    MULTILINESTRING = "MultiLineString"


class LineStringGeometry(BaseModel):
    """LineString geometry for track features."""
    type: Literal["LineString"] = "LineString"
    coordinates: List[List[float]] = Field(
        ...,
        min_length=2,
        description="Array of coordinate positions"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        """Validate coordinate array structure."""
        for coord in v:
            if len(coord) < 2 or len(coord) > 3:
                raise ValueError('Each coordinate must have 2 or 3 elements (lon, lat, [elevation])')
        return v


class MultiLineStringGeometry(BaseModel):
    """MultiLineString geometry for track features."""
    type: Literal["MultiLineString"] = "MultiLineString"
    coordinates: List[List[List[float]]] = Field(
        ...,
        min_length=1,
        description="Array of LineString coordinate arrays"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        """Validate coordinate array structure."""
        for linestring in v:
            if len(linestring) < 2:
                raise ValueError('Each LineString must have at least 2 coordinate positions')
            for coord in linestring:
                if len(coord) < 2 or len(coord) > 3:
                    raise ValueError('Each coordinate must have 2 or 3 elements (lon, lat, [elevation])')
        return v


class TrackProperties(BaseModel):
    """Properties for track features."""
    dataType: Literal["track"] = Field(
        "track",
        description="Discriminator to identify this as a track feature"
    )
    timestamps: Optional[List[datetime]] = Field(
        None,
        description="Optional array of timestamps corresponding to each coordinate point"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this track"
    )
    description: Optional[str] = Field(
        None,
        description="Additional description or notes about this track"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefTrackFeature(BaseModel):
    """A GeoJSON Feature representing a track with LineString or MultiLineString geometry."""

    type: Literal["Feature"] = "Feature"
    id: Union[str, int] = Field(
        ...,
        description="Unique identifier for this feature"
    )
    geometry: Union[LineStringGeometry, MultiLineStringGeometry]
    properties: TrackProperties

    class Config:
        extra = "forbid"  # No additional properties at top level