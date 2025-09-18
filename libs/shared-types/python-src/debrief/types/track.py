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


def from_str(x: Any) -> str:
    assert isinstance(x, str)
    return x


def from_none(x: Any) -> Any:
    assert x is None
    return x


def from_datetime(x: Any) -> datetime:
    return dateutil.parser.parse(x)


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class GeometryType(Enum):
    LINE_STRING = "LineString"
    MULTI_LINE_STRING = "MultiLineString"


class Geometry:
    coordinates: List[List[Union[float, List[float]]]]
    type: GeometryType

    def __init__(self, coordinates: List[List[Union[float, List[float]]]], type: GeometryType) -> None:
        self.coordinates = coordinates
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'Geometry':
        assert isinstance(obj, dict)
        coordinates = from_list(lambda x: from_list(lambda x: from_union([from_float, lambda x: from_list(from_float, x)], x), x), obj.get("coordinates"))
        type = GeometryType(obj.get("type"))
        return Geometry(coordinates, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["coordinates"] = from_list(lambda x: from_list(lambda x: from_union([to_float, lambda x: from_list(to_float, x)], x), x), self.coordinates)
        result["type"] = to_enum(GeometryType, self.type)
        return result


class DataType(Enum):
    """Discriminator to identify this as a track feature"""

    TRACK = "track"


class Properties:
    data_type: DataType
    """Discriminator to identify this as a track feature"""

    description: Optional[str]
    """Additional description or notes about this track"""

    name: Optional[str]
    """Human readable name for this track"""

    timestamps: Optional[List[datetime]]
    """Optional array of timestamps corresponding to each coordinate point"""

    def __init__(self, data_type: DataType, description: Optional[str], name: Optional[str], timestamps: Optional[List[datetime]]) -> None:
        self.data_type = data_type
        self.description = description
        self.name = name
        self.timestamps = timestamps

    @staticmethod
    def from_dict(obj: Any) -> 'Properties':
        assert isinstance(obj, dict)
        data_type = DataType(obj.get("dataType"))
        description = from_union([from_str, from_none], obj.get("description"))
        name = from_union([from_str, from_none], obj.get("name"))
        timestamps = from_union([lambda x: from_list(from_datetime, x), from_none], obj.get("timestamps"))
        return Properties(data_type, description, name, timestamps)

    def to_dict(self) -> dict:
        result: dict = {}
        result["dataType"] = to_enum(DataType, self.data_type)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.name is not None:
            result["name"] = from_union([from_str, from_none], self.name)
        if self.timestamps is not None:
            result["timestamps"] = from_union([lambda x: from_list(lambda x: x.isoformat(), x), from_none], self.timestamps)
        return result


class TrackFeatureType(Enum):
    FEATURE = "Feature"


class TrackFeature:
    """A GeoJSON Feature representing a track with LineString or MultiLineString geometry and
    optional timestamps
    """
    geometry: Geometry
    id: Union[float, str]
    """Unique identifier for this feature"""

    properties: Properties
    type: TrackFeatureType

    def __init__(self, geometry: Geometry, id: Union[float, str], properties: Properties, type: TrackFeatureType) -> None:
        self.geometry = geometry
        self.id = id
        self.properties = properties
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'TrackFeature':
        assert isinstance(obj, dict)
        geometry = Geometry.from_dict(obj.get("geometry"))
        id = from_union([from_float, from_str], obj.get("id"))
        properties = Properties.from_dict(obj.get("properties"))
        type = TrackFeatureType(obj.get("type"))
        return TrackFeature(geometry, id, properties, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["geometry"] = to_class(Geometry, self.geometry)
        result["id"] = from_union([to_float, from_str], self.id)
        result["properties"] = to_class(Properties, self.properties)
        result["type"] = to_enum(TrackFeatureType, self.type)
        return result


def track_feature_from_dict(s: Any) -> TrackFeature:
    return TrackFeature.from_dict(s)


def track_feature_to_dict(x: TrackFeature) -> Any:
    return to_class(TrackFeature, x)
