"""Backdrop Pydantic model for tile layer configuration features."""

from typing import Literal, Optional

from geojson_pydantic import Feature, MultiPoint
from pydantic import BaseModel, Field, field_validator


class BackdropProperties(BaseModel):
    """Properties for backdrop features (tile layer configurations)."""
    dataType: Literal["backdrop"] = Field(
        "backdrop",
        description="Discriminator to identify this as a backdrop feature"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this backdrop"
    )
    url: Optional[str] = Field(
        None,
        description="URL template for the tile layer"
    )
    visible: Optional[bool] = Field(
        True,
        description="Whether this backdrop is visible"
    )
    maxNativeZoom: Optional[int] = Field(
        None,
        description="Maximum native zoom level of the tile layer"
    )
    maxZoom: Optional[int] = Field(
        None,
        description="Maximum zoom level to display"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefBackdropFeature(Feature[MultiPoint, BackdropProperties]):
    """A GeoJSON Feature representing a backdrop tile layer configuration.

    Note: Uses MultiPoint with empty coordinates as it's not a geographic feature to render.
    """

    @field_validator('geometry')
    @classmethod
    def validate_backdrop_geometry(cls, v):
        """Ensure geometry is MultiPoint."""
        if not isinstance(v, MultiPoint):
            raise ValueError('Backdrop features must have MultiPoint geometry')
        return v