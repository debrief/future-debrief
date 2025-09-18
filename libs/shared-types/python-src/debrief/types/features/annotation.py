"""Annotation Pydantic model for maritime zone/annotation features."""

from datetime import datetime
from pydantic import BaseModel, Field, validator
from typing import List, Union, Literal, Optional
from enum import Enum


class AnnotationType(str, Enum):
    """Types of annotations."""
    LABEL = "label"
    AREA = "area"
    MEASUREMENT = "measurement"
    COMMENT = "comment"
    BOUNDARY = "boundary"


class AnnotationPointGeometry(BaseModel):
    """Point geometry for annotations."""
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="Coordinate position [longitude, latitude, elevation?]"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        if len(v) < 2 or len(v) > 3:
            raise ValueError('Coordinates must have 2 or 3 elements')
        return v


class AnnotationLineStringGeometry(BaseModel):
    """LineString geometry for annotations."""
    type: Literal["LineString"] = "LineString"
    coordinates: List[List[float]] = Field(
        ...,
        min_length=2,
        description="Array of coordinate positions"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        for coord in v:
            if len(coord) < 2 or len(coord) > 3:
                raise ValueError('Each coordinate must have 2 or 3 elements')
        return v


class AnnotationPolygonGeometry(BaseModel):
    """Polygon geometry for annotations."""
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]] = Field(
        ...,
        min_length=1,
        description="Array of LinearRing coordinate arrays"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        for ring in v:
            if len(ring) < 4:
                raise ValueError('Each LinearRing must have at least 4 coordinate positions')
            for coord in ring:
                if len(coord) < 2 or len(coord) > 3:
                    raise ValueError('Each coordinate must have 2 or 3 elements')
        return v


class AnnotationMultiPointGeometry(BaseModel):
    """MultiPoint geometry for annotations."""
    type: Literal["MultiPoint"] = "MultiPoint"
    coordinates: List[List[float]] = Field(
        ...,
        description="Array of coordinate positions"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        for coord in v:
            if len(coord) < 2 or len(coord) > 3:
                raise ValueError('Each coordinate must have 2 or 3 elements')
        return v


class AnnotationMultiLineStringGeometry(BaseModel):
    """MultiLineString geometry for annotations."""
    type: Literal["MultiLineString"] = "MultiLineString"
    coordinates: List[List[List[float]]] = Field(
        ...,
        min_length=1,
        description="Array of LineString coordinate arrays"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        for linestring in v:
            if len(linestring) < 2:
                raise ValueError('Each LineString must have at least 2 coordinate positions')
            for coord in linestring:
                if len(coord) < 2 or len(coord) > 3:
                    raise ValueError('Each coordinate must have 2 or 3 elements')
        return v


class AnnotationMultiPolygonGeometry(BaseModel):
    """MultiPolygon geometry for annotations."""
    type: Literal["MultiPolygon"] = "MultiPolygon"
    coordinates: List[List[List[List[float]]]] = Field(
        ...,
        description="Array of Polygon coordinate arrays"
    )

    @validator('coordinates')
    def validate_coordinates(cls, v):
        for polygon in v:
            if len(polygon) < 1:
                raise ValueError('Each Polygon must have at least 1 LinearRing')
            for ring in polygon:
                if len(ring) < 4:
                    raise ValueError('Each LinearRing must have at least 4 coordinate positions')
                for coord in ring:
                    if len(coord) < 2 or len(coord) > 3:
                        raise ValueError('Each coordinate must have 2 or 3 elements')
        return v


class AnnotationProperties(BaseModel):
    """Properties for annotation features."""
    dataType: Literal["zone"] = Field(
        "zone",
        description="Discriminator to identify this as a zone feature"
    )
    annotationType: Optional[AnnotationType] = Field(
        None,
        description="Type of annotation"
    )
    text: Optional[str] = Field(
        None,
        description="Text content of the annotation"
    )
    color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9a-fA-F]{6}$",
        description="Color code in hex format"
    )
    time: Optional[datetime] = Field(
        None,
        description="Timestamp when annotation was created"
    )
    name: Optional[str] = Field(
        None,
        description="Human readable name for this annotation"
    )
    description: Optional[str] = Field(
        None,
        description="Additional description or notes about this annotation"
    )

    class Config:
        extra = "allow"  # Allow additional properties


class DebriefAnnotationFeature(BaseModel):
    """A GeoJSON Feature representing an annotation with any geometry type."""

    type: Literal["Feature"] = "Feature"
    id: Union[str, int] = Field(
        ...,
        description="Unique identifier for this feature"
    )
    geometry: Union[
        AnnotationPointGeometry,
        AnnotationLineStringGeometry,
        AnnotationPolygonGeometry,
        AnnotationMultiPointGeometry,
        AnnotationMultiLineStringGeometry,
        AnnotationMultiPolygonGeometry
    ]
    properties: AnnotationProperties

    class Config:
        extra = "forbid"  # No additional properties at top level