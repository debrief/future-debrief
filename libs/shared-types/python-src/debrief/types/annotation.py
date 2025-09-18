from enum import Enum
from typing import List, Union, Any, Optional, TypeVar, Callable, Type, cast
from datetime import datetime
import dateutil.parser


T = TypeVar("T")
EnumT = TypeVar("EnumT", bound=Enum)


def from_list(f: Callable[[Any], T], x: Any) -> List[T]:
    assert isinstance(x, list)
    return [f(y) for y in x]


def from_float(x: Any) -> float:
    assert isinstance(x, (float, int)) and not isinstance(x, bool)
    return float(x)


def from_union(fs, x):
    for f in fs:
        try:
            return f(x)
        except:
            pass
    assert False


def to_float(x: Any) -> float:
    assert isinstance(x, (int, float))
    return x


def to_enum(c: Type[EnumT], x: Any) -> EnumT:
    assert isinstance(x, c)
    return x.value


def from_none(x: Any) -> Any:
    assert x is None
    return x


def from_str(x: Any) -> str:
    assert isinstance(x, str)
    return x


def from_datetime(x: Any) -> datetime:
    return dateutil.parser.parse(x)


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class GeometryType(Enum):
    LINE_STRING = "LineString"
    MULTI_LINE_STRING = "MultiLineString"
    MULTI_POINT = "MultiPoint"
    MULTI_POLYGON = "MultiPolygon"
    POINT = "Point"
    POLYGON = "Polygon"


class Geometry:
    coordinates: List[Union[float, List[Union[float, List[Union[float, List[float]]]]]]]
    type: GeometryType

    def __init__(self, coordinates: List[Union[float, List[Union[float, List[Union[float, List[float]]]]]]], type: GeometryType) -> None:
        self.coordinates = coordinates
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'Geometry':
        assert isinstance(obj, dict)
        coordinates = from_list(lambda x: from_union([from_float, lambda x: from_list(lambda x: from_union([from_float, lambda x: from_list(lambda x: from_union([from_float, lambda x: from_list(from_float, x)], x), x)], x), x)], x), obj.get("coordinates"))
        type = GeometryType(obj.get("type"))
        return Geometry(coordinates, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["coordinates"] = from_list(lambda x: from_union([to_float, lambda x: from_list(lambda x: from_union([to_float, lambda x: from_list(lambda x: from_union([to_float, lambda x: from_list(to_float, x)], x), x)], x), x)], x), self.coordinates)
        result["type"] = to_enum(GeometryType, self.type)
        return result


class AnnotationType(Enum):
    """Type of annotation"""

    AREA = "area"
    BOUNDARY = "boundary"
    COMMENT = "comment"
    LABEL = "label"
    MEASUREMENT = "measurement"


class DataType(Enum):
    """Discriminator to identify this as a zone feature"""

    ZONE = "zone"


class Properties:
    annotation_type: Optional[AnnotationType]
    """Type of annotation"""

    color: Optional[str]
    """Color code in hex format"""

    data_type: DataType
    """Discriminator to identify this as a zone feature"""

    description: Optional[str]
    """Additional description or notes about this annotation"""

    name: Optional[str]
    """Human readable name for this annotation"""

    text: Optional[str]
    """Text content of the annotation"""

    time: Optional[datetime]
    """Timestamp when annotation was created"""

    def __init__(self, annotation_type: Optional[AnnotationType], color: Optional[str], data_type: DataType, description: Optional[str], name: Optional[str], text: Optional[str], time: Optional[datetime]) -> None:
        self.annotation_type = annotation_type
        self.color = color
        self.data_type = data_type
        self.description = description
        self.name = name
        self.text = text
        self.time = time

    @staticmethod
    def from_dict(obj: Any) -> 'Properties':
        assert isinstance(obj, dict)
        annotation_type = from_union([AnnotationType, from_none], obj.get("annotationType"))
        color = from_union([from_str, from_none], obj.get("color"))
        data_type = DataType(obj.get("dataType"))
        description = from_union([from_str, from_none], obj.get("description"))
        name = from_union([from_str, from_none], obj.get("name"))
        text = from_union([from_str, from_none], obj.get("text"))
        time = from_union([from_datetime, from_none], obj.get("time"))
        return Properties(annotation_type, color, data_type, description, name, text, time)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.annotation_type is not None:
            result["annotationType"] = from_union([lambda x: to_enum(AnnotationType, x), from_none], self.annotation_type)
        if self.color is not None:
            result["color"] = from_union([from_str, from_none], self.color)
        result["dataType"] = to_enum(DataType, self.data_type)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.name is not None:
            result["name"] = from_union([from_str, from_none], self.name)
        if self.text is not None:
            result["text"] = from_union([from_str, from_none], self.text)
        if self.time is not None:
            result["time"] = from_union([lambda x: x.isoformat(), from_none], self.time)
        return result


class AnnotationFeatureType(Enum):
    FEATURE = "Feature"


class AnnotationFeature:
    """A GeoJSON Feature representing an annotation with any geometry type"""

    geometry: Geometry
    id: Union[float, str]
    """Unique identifier for this feature"""

    properties: Properties
    type: AnnotationFeatureType

    def __init__(self, geometry: Geometry, id: Union[float, str], properties: Properties, type: AnnotationFeatureType) -> None:
        self.geometry = geometry
        self.id = id
        self.properties = properties
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'AnnotationFeature':
        assert isinstance(obj, dict)
        geometry = Geometry.from_dict(obj.get("geometry"))
        id = from_union([from_float, from_str], obj.get("id"))
        properties = Properties.from_dict(obj.get("properties"))
        type = AnnotationFeatureType(obj.get("type"))
        return AnnotationFeature(geometry, id, properties, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["geometry"] = to_class(Geometry, self.geometry)
        result["id"] = from_union([to_float, from_str], self.id)
        result["properties"] = to_class(Properties, self.properties)
        result["type"] = to_enum(AnnotationFeatureType, self.type)
        return result


def annotation_feature_from_dict(s: Any) -> AnnotationFeature:
    return AnnotationFeature.from_dict(s)


def annotation_feature_to_dict(x: AnnotationFeature) -> Any:
    return to_class(AnnotationFeature, x)
