"""Track Pydantic model for maritime track features."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import List, Union, Literal, Optional, Any, Dict
from enum import Enum
from geojson_pydantic import Feature, LineString, MultiLineString


# Geometry types are now provided by geojson-pydantic 
# LineString and MultiLineString are imported from geojson_pydantic


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


class DebriefTrackFeature(Feature[Union[LineString, MultiLineString], TrackProperties]):
    """A GeoJSON Feature representing a track with LineString or MultiLineString geometry."""

    @field_validator('geometry')
    @classmethod
    def validate_track_geometry(cls, v):
        """Ensure geometry is LineString or MultiLineString."""
        if not isinstance(v, (LineString, MultiLineString)):
            raise ValueError('Track features must have LineString or MultiLineString geometry')
        return v