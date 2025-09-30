"""Metadata Pydantic models for system state features."""

from datetime import datetime
from typing import List, Literal, Optional, Union

from geojson_pydantic import Feature, Polygon
from pydantic import BaseModel, Field, field_validator


class SystemMetadataProperties(BaseModel):
    """Base properties for all system metadata features."""
    dataType: Literal["metadata"] = Field(
        "metadata",
        description="Discriminator to identify this as a metadata feature"
    )
    metadataType: str = Field(
        ...,
        description="Type of metadata (viewport, time, selection)"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class ViewportMetadataProperties(SystemMetadataProperties):
    """Properties for viewport metadata features."""
    metadataType: Literal["viewport"] = Field(
        "viewport",
        description="Identifies this as viewport metadata"
    )


class TimeMetadataProperties(SystemMetadataProperties):
    """Properties for time metadata features."""
    metadataType: Literal["time"] = Field(
        "time",
        description="Identifies this as time metadata"
    )
    current: Optional[datetime] = Field(
        None,
        description="Current time position"
    )
    start: Optional[datetime] = Field(
        None,
        description="Start time of the overall time range"
    )
    end: Optional[datetime] = Field(
        None,
        description="End time of the overall time range"
    )


class SelectionMetadataProperties(SystemMetadataProperties):
    """Properties for selection metadata features."""
    metadataType: Literal["selection"] = Field(
        "selection",
        description="Identifies this as selection metadata"
    )
    selectedIds: Optional[List[Union[str, int]]] = Field(
        None,
        description="Array of selected feature IDs"
    )


class ViewportMetadataFeature(Feature[Polygon, ViewportMetadataProperties]):
    """A GeoJSON Feature representing viewport bounds stored as polygon geometry."""

    @field_validator('geometry')
    @classmethod
    def validate_viewport_geometry(cls, v):
        """Ensure geometry is Polygon."""
        if not isinstance(v, Polygon):
            raise ValueError('Viewport metadata features must have Polygon geometry')
        return v


class TimeMetadataFeature(Feature[Polygon, TimeMetadataProperties]):
    """A GeoJSON Feature representing time state metadata."""

    @field_validator('geometry')
    @classmethod
    def validate_time_geometry(cls, v):
        """Ensure geometry is Polygon (can be empty/placeholder)."""
        if not isinstance(v, Polygon):
            raise ValueError('Time metadata features must have Polygon geometry')
        return v


class SelectionMetadataFeature(Feature[Polygon, SelectionMetadataProperties]):
    """A GeoJSON Feature representing selection state metadata."""

    @field_validator('geometry')
    @classmethod
    def validate_selection_geometry(cls, v):
        """Ensure geometry is Polygon (can be empty/placeholder)."""
        if not isinstance(v, Polygon):
            raise ValueError('Selection metadata features must have Polygon geometry')
        return v


# Union type for all metadata features
MetadataFeature = Union[ViewportMetadataFeature, TimeMetadataFeature, SelectionMetadataFeature]