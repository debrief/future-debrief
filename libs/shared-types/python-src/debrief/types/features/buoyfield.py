"""Buoyfield Pydantic model for maritime buoyfield features."""

from datetime import datetime
from typing import Literal, Optional

from geojson_pydantic import Feature, MultiPoint
from pydantic import BaseModel, Field, field_validator


class BuoyfieldProperties(BaseModel):
    """Properties for buoyfield features."""
    dataType: Literal["buoyfield"] = Field(
        "buoyfield",
        description="Discriminator to identify this as a buoyfield feature"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this buoyfield"
    )
    shortName: Optional[str] = Field(
        None,
        description="Short name or abbreviation for this buoyfield"
    )
    visible: Optional[bool] = Field(
        True,
        description="Whether this buoyfield is visible"
    )
    time: Optional[datetime] = Field(
        None,
        description="Start time for this buoyfield"
    )
    timeEnd: Optional[datetime] = Field(
        None,
        description="End time for this buoyfield"
    )

    class Config:
        extra = "allow"  # Allow additional properties like marker-color


class DebriefBuoyfieldFeature(Feature[MultiPoint, BuoyfieldProperties]):
    """A GeoJSON Feature representing a buoyfield with MultiPoint geometry."""

    @field_validator('geometry')
    @classmethod
    def validate_buoyfield_geometry(cls, v):
        """Ensure geometry is MultiPoint."""
        if not isinstance(v, MultiPoint):
            raise ValueError('Buoyfield features must have MultiPoint geometry')
        return v