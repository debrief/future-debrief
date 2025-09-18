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
    MULTI_POINT = "MultiPoint"
    MULTI_POLYGON = "MultiPolygon"
    POINT = "Point"
    POLYGON = "Polygon"


class Geometry:
    coordinates: List[Union[List[Union[float, List[Union[float, List[float]]]]], float]]
    type: GeometryType

    def __init__(self, coordinates: List[Union[List[Union[float, List[Union[float, List[float]]]]], float]], type: GeometryType) -> None:
        self.coordinates = coordinates
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'Geometry':
        assert isinstance(obj, dict)
        coordinates = from_list(lambda x: from_union([lambda x: from_list(lambda x: from_union([from_float, lambda x: from_list(lambda x: from_union([from_float, lambda x: from_list(from_float, x)], x), x)], x), x), from_float], x), obj.get("coordinates"))
        type = GeometryType(obj.get("type"))
        return Geometry(coordinates, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["coordinates"] = from_list(lambda x: from_union([lambda x: from_list(lambda x: from_union([to_float, lambda x: from_list(lambda x: from_union([to_float, lambda x: from_list(to_float, x)], x), x)], x), x), to_float], x), self.coordinates)
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
    """Discriminator to identify this as a track feature
    
    Discriminator to identify this as a reference point feature
    
    Discriminator to identify this as a zone feature
    """
    REFERENCE_POINT = "reference-point"
    TRACK = "track"
    ZONE = "zone"


class DebriefFeatureProperties:
    data_type: DataType
    """Discriminator to identify this as a track feature
    
    Discriminator to identify this as a reference point feature
    
    Discriminator to identify this as a zone feature
    """
    description: Optional[str]
    """Additional description or notes about this track
    
    Additional description or notes for this point
    
    Additional description or notes about this annotation
    """
    name: Optional[str]
    """Human readable name for this track
    
    Human readable name for this point
    
    Human readable name for this annotation
    """
    timestamps: Optional[List[datetime]]
    """Optional array of timestamps corresponding to each coordinate point"""

    time: Optional[datetime]
    """Single timestamp for this point
    
    Timestamp when annotation was created
    """
    time_end: Optional[datetime]
    """End time for a time range"""

    time_start: Optional[datetime]
    """Start time for a time range"""

    annotation_type: Optional[AnnotationType]
    """Type of annotation"""

    color: Optional[str]
    """Color code in hex format"""

    text: Optional[str]
    """Text content of the annotation"""

    def __init__(self, data_type: DataType, description: Optional[str], name: Optional[str], timestamps: Optional[List[datetime]], time: Optional[datetime], time_end: Optional[datetime], time_start: Optional[datetime], annotation_type: Optional[AnnotationType], color: Optional[str], text: Optional[str]) -> None:
        self.data_type = data_type
        self.description = description
        self.name = name
        self.timestamps = timestamps
        self.time = time
        self.time_end = time_end
        self.time_start = time_start
        self.annotation_type = annotation_type
        self.color = color
        self.text = text

    @staticmethod
    def from_dict(obj: Any) -> 'DebriefFeatureProperties':
        assert isinstance(obj, dict)
        data_type = DataType(obj.get("dataType"))
        description = from_union([from_str, from_none], obj.get("description"))
        name = from_union([from_str, from_none], obj.get("name"))
        timestamps = from_union([lambda x: from_list(from_datetime, x), from_none], obj.get("timestamps"))
        time = from_union([from_datetime, from_none], obj.get("time"))
        time_end = from_union([from_datetime, from_none], obj.get("timeEnd"))
        time_start = from_union([from_datetime, from_none], obj.get("timeStart"))
        annotation_type = from_union([AnnotationType, from_none], obj.get("annotationType"))
        color = from_union([from_str, from_none], obj.get("color"))
        text = from_union([from_str, from_none], obj.get("text"))
        return DebriefFeatureProperties(data_type, description, name, timestamps, time, time_end, time_start, annotation_type, color, text)

    def to_dict(self) -> dict:
        result: dict = {}
        result["dataType"] = to_enum(DataType, self.data_type)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.name is not None:
            result["name"] = from_union([from_str, from_none], self.name)
        if self.timestamps is not None:
            result["timestamps"] = from_union([lambda x: from_list(lambda x: x.isoformat(), x), from_none], self.timestamps)
        if self.time is not None:
            result["time"] = from_union([lambda x: x.isoformat(), from_none], self.time)
        if self.time_end is not None:
            result["timeEnd"] = from_union([lambda x: x.isoformat(), from_none], self.time_end)
        if self.time_start is not None:
            result["timeStart"] = from_union([lambda x: x.isoformat(), from_none], self.time_start)
        if self.annotation_type is not None:
            result["annotationType"] = from_union([lambda x: to_enum(AnnotationType, x), from_none], self.annotation_type)
        if self.color is not None:
            result["color"] = from_union([from_str, from_none], self.color)
        if self.text is not None:
            result["text"] = from_union([from_str, from_none], self.text)
        return result


class DebriefFeatureType(Enum):
    FEATURE = "Feature"


class DebriefFeature:
    """Union type representing any valid Debrief feature (track, point, or annotation)
    
    A GeoJSON Feature representing a track with LineString or MultiLineString geometry and
    optional timestamps
    
    A GeoJSON Feature representing a point with time properties
    
    A GeoJSON Feature representing an annotation with any geometry type
    """
    geometry: Geometry
    id: Union[float, str]
    """Unique identifier for this feature"""

    properties: DebriefFeatureProperties
    type: DebriefFeatureType

    def __init__(self, geometry: Geometry, id: Union[float, str], properties: DebriefFeatureProperties, type: DebriefFeatureType) -> None:
        self.geometry = geometry
        self.id = id
        self.properties = properties
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'DebriefFeature':
        assert isinstance(obj, dict)
        geometry = Geometry.from_dict(obj.get("geometry"))
        id = from_union([from_float, from_str], obj.get("id"))
        properties = DebriefFeatureProperties.from_dict(obj.get("properties"))
        type = DebriefFeatureType(obj.get("type"))
        return DebriefFeature(geometry, id, properties, type)

    def to_dict(self) -> dict:
        result: dict = {}
        result["geometry"] = to_class(Geometry, self.geometry)
        result["id"] = from_union([to_float, from_str], self.id)
        result["properties"] = to_class(DebriefFeatureProperties, self.properties)
        result["type"] = to_enum(DebriefFeatureType, self.type)
        return result


class DebriefFeatureCollectionProperties:
    created: Optional[datetime]
    """When this collection was created"""

    description: Optional[str]
    """Description of this feature collection"""

    modified: Optional[datetime]
    """When this collection was last modified"""

    name: Optional[str]
    """Human readable name for this collection"""

    version: Optional[str]
    """Version of this collection"""

    def __init__(self, created: Optional[datetime], description: Optional[str], modified: Optional[datetime], name: Optional[str], version: Optional[str]) -> None:
        self.created = created
        self.description = description
        self.modified = modified
        self.name = name
        self.version = version

    @staticmethod
    def from_dict(obj: Any) -> 'DebriefFeatureCollectionProperties':
        assert isinstance(obj, dict)
        created = from_union([from_datetime, from_none], obj.get("created"))
        description = from_union([from_str, from_none], obj.get("description"))
        modified = from_union([from_datetime, from_none], obj.get("modified"))
        name = from_union([from_str, from_none], obj.get("name"))
        version = from_union([from_str, from_none], obj.get("version"))
        return DebriefFeatureCollectionProperties(created, description, modified, name, version)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.created is not None:
            result["created"] = from_union([lambda x: x.isoformat(), from_none], self.created)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.modified is not None:
            result["modified"] = from_union([lambda x: x.isoformat(), from_none], self.modified)
        if self.name is not None:
            result["name"] = from_union([from_str, from_none], self.name)
        if self.version is not None:
            result["version"] = from_union([from_str, from_none], self.version)
        return result


class DebriefFeatureCollectionType(Enum):
    FEATURE_COLLECTION = "FeatureCollection"


class DebriefFeatureCollection:
    """A GeoJSON FeatureCollection containing mixed feature types for maritime analysis"""

    bbox: Optional[List[float]]
    """Bounding box of the feature collection"""

    features: List[DebriefFeature]
    properties: Optional[DebriefFeatureCollectionProperties]
    type: DebriefFeatureCollectionType

    def __init__(self, bbox: Optional[List[float]], features: List[DebriefFeature], properties: Optional[DebriefFeatureCollectionProperties], type: DebriefFeatureCollectionType) -> None:
        self.bbox = bbox
        self.features = features
        self.properties = properties
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'DebriefFeatureCollection':
        assert isinstance(obj, dict)
        bbox = from_union([lambda x: from_list(from_float, x), from_none], obj.get("bbox"))
        features = from_list(DebriefFeature.from_dict, obj.get("features"))
        properties = from_union([DebriefFeatureCollectionProperties.from_dict, from_none], obj.get("properties"))
        type = DebriefFeatureCollectionType(obj.get("type"))
        return DebriefFeatureCollection(bbox, features, properties, type)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.bbox is not None:
            result["bbox"] = from_union([lambda x: from_list(to_float, x), from_none], self.bbox)
        result["features"] = from_list(lambda x: to_class(DebriefFeature, x), self.features)
        if self.properties is not None:
            result["properties"] = from_union([lambda x: to_class(DebriefFeatureCollectionProperties, x), from_none], self.properties)
        result["type"] = to_enum(DebriefFeatureCollectionType, self.type)
        return result


def debrief_feature_collection_from_dict(s: Any) -> DebriefFeatureCollection:
    return DebriefFeatureCollection.from_dict(s)


def debrief_feature_collection_to_dict(x: DebriefFeatureCollection) -> Any:
    return to_class(DebriefFeatureCollection, x)
