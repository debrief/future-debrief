"""ConstrainedFeature Pydantic model for features with geometry and dataType constraints."""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

# Import feature types from features module
from typing import Union
from ..features.track import DebriefTrackFeature
from ..features.point import DebriefPointFeature
from ..features.annotation import DebriefAnnotationFeature

# Define DebriefFeature as Union type
DebriefFeature = Union[DebriefTrackFeature, DebriefPointFeature, DebriefAnnotationFeature]


class GeometryType(str, Enum):
    """Valid GeoJSON geometry types."""
    POINT = "Point"
    LINE_STRING = "LineString"
    MULTI_LINE_STRING = "MultiLineString"
    POLYGON = "Polygon"
    MULTI_POLYGON = "MultiPolygon"


class DataType(str, Enum):
    """Valid feature dataType values."""
    TRACK = "track"
    REFERENCE_POINT = "reference-point"
    ANNOTATION = "annotation"


class GeometryConstrainedFeature(BaseModel):
    """A DebriefFeature with constraints on geometry type and/or dataType."""

    allowedGeometryTypes: Optional[List[GeometryType]] = Field(
        None,
        description="Allowed GeoJSON geometry types"
    )
    allowedDataTypes: Optional[List[DataType]] = Field(
        None,
        description="Allowed feature.properties.dataType values"
    )
    feature: DebriefFeature = Field(
        ...,
        description="The constrained feature"
    )

    class Config:
        extra = "forbid"  # No additional properties