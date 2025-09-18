from enum import Enum
from typing import List, Any, Optional, Union, TypeVar, Callable, Type, cast
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


def from_union(fs, x):
    for f in fs:
        try:
            return f(x)
        except:
            pass
    assert False


def from_datetime(x: Any) -> datetime:
    return dateutil.parser.parse(x)


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


class GeometryType(Enum):
    POINT = "Point"


class Geometry:
    coordinates: List[float]
    type: GeometryType

    def __init__(self, coordinates: List[float], type: GeometryType) -> None:
        self.coordinates = coordinates
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'Geometry':
        assert isinstance(obj, dict)
        coordinates = from_list(from_float, obj.get("coordinates"))
        type = GeometryType(obj.get("type"))
        return Geometry(coordinates, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["coordinates"] = from_list(to_float, self.coordinates)
        result["type"] = to_enum(GeometryType, self.type)
        return result


class DataType(Enum):
    """Discriminator to identify this as a reference point feature"""

    REFERENCE_POINT = "reference-point"


class Properties:
    data_type: DataType
    """Discriminator to identify this as a reference point feature"""

    description: Optional[str]
    """Additional description or notes for this point"""

    name: Optional[str]
    """Human readable name for this point"""

    time: Optional[datetime]
    """Single timestamp for this point"""

    time_end: Optional[datetime]
    """End time for a time range"""

    time_start: Optional[datetime]
    """Start time for a time range"""

    def __init__(self, data_type: DataType, description: Optional[str], name: Optional[str], time: Optional[datetime], time_end: Optional[datetime], time_start: Optional[datetime]) -> None:
        self.data_type = data_type
        self.description = description
        self.name = name
        self.time = time
        self.time_end = time_end
        self.time_start = time_start

    @staticmethod
    def from_dict(obj: Any) -> 'Properties':
        assert isinstance(obj, dict)
        data_type = DataType(obj.get("dataType"))
        description = from_union([from_str, from_none], obj.get("description"))
        name = from_union([from_str, from_none], obj.get("name"))
        time = from_union([from_datetime, from_none], obj.get("time"))
        time_end = from_union([from_datetime, from_none], obj.get("timeEnd"))
        time_start = from_union([from_datetime, from_none], obj.get("timeStart"))
        return Properties(data_type, description, name, time, time_end, time_start)

    def to_dict(self) -> dict:
        result: dict = {}
        result["dataType"] = to_enum(DataType, self.data_type)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.name is not None:
            result["name"] = from_union([from_str, from_none], self.name)
        if self.time is not None:
            result["time"] = from_union([lambda x: x.isoformat(), from_none], self.time)
        if self.time_end is not None:
            result["timeEnd"] = from_union([lambda x: x.isoformat(), from_none], self.time_end)
        if self.time_start is not None:
            result["timeStart"] = from_union([lambda x: x.isoformat(), from_none], self.time_start)
        return result


class PointFeatureType(Enum):
    FEATURE = "Feature"


class PointFeature:
    """A GeoJSON Feature representing a point with time properties"""

    geometry: Geometry
    id: Union[float, str]
    """Unique identifier for this feature"""

    properties: Properties
    type: PointFeatureType

    def __init__(self, geometry: Geometry, id: Union[float, str], properties: Properties, type: PointFeatureType) -> None:
        self.geometry = geometry
        self.id = id
        self.properties = properties
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'PointFeature':
        assert isinstance(obj, dict)
        geometry = Geometry.from_dict(obj.get("geometry"))
        id = from_union([from_float, from_str], obj.get("id"))
        properties = Properties.from_dict(obj.get("properties"))
        type = PointFeatureType(obj.get("type"))
        return PointFeature(geometry, id, properties, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["geometry"] = to_class(Geometry, self.geometry)
        result["id"] = from_union([to_float, from_str], self.id)
        result["properties"] = to_class(Properties, self.properties)
        result["type"] = to_enum(PointFeatureType, self.type)
        return result


def point_feature_from_dict(s: Any) -> PointFeature:
    return PointFeature.from_dict(s)


def point_feature_to_dict(x: PointFeature) -> Any:
    return to_class(PointFeature, x)
