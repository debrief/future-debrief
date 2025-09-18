"""Annotation Pydantic model for maritime zone/annotation features."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import List, Union, Literal, Optional
from enum import Enum
from geojson_pydantic import Feature, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon


class AnnotationType(str, Enum):
    """Types of annotations."""
    LABEL = "label"
    AREA = "area"
    MEASUREMENT = "measurement"
    COMMENT = "comment"
    BOUNDARY = "boundary"


# All geometry types are now provided by geojson-pydantic
# Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon are imported from geojson_pydantic


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


class DebriefAnnotationFeature(Feature[Union[Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon], AnnotationProperties]):
    """A GeoJSON Feature representing an annotation with any geometry type."""