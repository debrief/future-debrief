from enum import Enum
from typing import Union, Optional, Any, List, Dict, TypeVar, Callable, Type, cast


T = TypeVar("T")
EnumT = TypeVar("EnumT", bound=Enum)


def from_bool(x: Any) -> bool:
    assert isinstance(x, bool)
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


def from_str(x: Any) -> str:
    assert isinstance(x, str)
    return x


def from_list(f: Callable[[Any], T], x: Any) -> List[T]:
    assert isinstance(x, list)
    return [f(y) for y in x]


def from_dict(f: Callable[[Any], T], x: Any) -> Dict[str, T]:
    assert isinstance(x, dict)
    return { k: f(v) for (k, v) in x.items() }


def to_class(c: Type[T], x: Any) -> dict:
    assert isinstance(x, c)
    return cast(Any, x).to_dict()


def to_enum(c: Type[EnumT], x: Any) -> EnumT:
    assert isinstance(x, c)
    return x.value


class TypeEnum(Enum):
    ARRAY = "array"
    BOOLEAN = "boolean"
    INTEGER = "integer"
    NULL = "null"
    NUMBER = "number"
    OBJECT = "object"
    STRING = "string"


class JSONSchemaSchema:
    additional_properties: Optional[Union[bool, 'JSONSchemaSchema']]
    default: Any
    description: Optional[str]
    enum: Optional[List[Any]]
    items: Optional['JSONSchemaSchema']
    properties: Optional[Dict[str, 'JSONSchemaSchema']]
    required: Optional[List[str]]
    type: Optional[TypeEnum]

    def __init__(self, additional_properties: Optional[Union[bool, 'JSONSchemaSchema']], default: Any, description: Optional[str], enum: Optional[List[Any]], items: Optional['JSONSchemaSchema'], properties: Optional[Dict[str, 'JSONSchemaSchema']], required: Optional[List[str]], type: Optional[TypeEnum]) -> None:
        self.additional_properties = additional_properties
        self.default = default
        self.description = description
        self.enum = enum
        self.items = items
        self.properties = properties
        self.required = required
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'JSONSchemaSchema':
        assert isinstance(obj, dict)
        additional_properties = from_union([from_bool, JSONSchemaSchema.from_dict, from_none], obj.get("additionalProperties"))
        default = obj.get("default")
        description = from_union([from_str, from_none], obj.get("description"))
        enum = from_union([lambda x: from_list(lambda x: x, x), from_none], obj.get("enum"))
        items = from_union([JSONSchemaSchema.from_dict, from_none], obj.get("items"))
        properties = from_union([lambda x: from_dict(JSONSchemaSchema.from_dict, x), from_none], obj.get("properties"))
        required = from_union([lambda x: from_list(from_str, x), from_none], obj.get("required"))
        type = from_union([TypeEnum, from_none], obj.get("type"))
        return JSONSchemaSchema(additional_properties, default, description, enum, items, properties, required, type)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.additional_properties is not None:
            result["additionalProperties"] = from_union([from_bool, lambda x: to_class(JSONSchemaSchema, x), from_none], self.additional_properties)
        if self.default is not None:
            result["default"] = self.default
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.enum is not None:
            result["enum"] = from_union([lambda x: from_list(lambda x: x, x), from_none], self.enum)
        if self.items is not None:
            result["items"] = from_union([lambda x: to_class(JSONSchemaSchema, x), from_none], self.items)
        if self.properties is not None:
            result["properties"] = from_union([lambda x: from_dict(lambda x: to_class(JSONSchemaSchema, x), x), from_none], self.properties)
        if self.required is not None:
            result["required"] = from_union([lambda x: from_list(from_str, x), from_none], self.required)
        if self.type is not None:
            result["type"] = from_union([lambda x: to_enum(TypeEnum, x), from_none], self.type)
        return result


class JSONSchema:
    """JSON Schema defining the expected input parameters
    
    A JSON Schema object for defining data structure constraints
    
    Optional JSON Schema defining the expected output format
    """
    additional_properties: Optional[Union[bool, JSONSchemaSchema]]
    description: Optional[str]
    properties: Optional[Dict[str, JSONSchemaSchema]]
    required: Optional[List[str]]
    type: Optional[TypeEnum]

    def __init__(self, additional_properties: Optional[Union[bool, JSONSchemaSchema]], description: Optional[str], properties: Optional[Dict[str, JSONSchemaSchema]], required: Optional[List[str]], type: Optional[TypeEnum]) -> None:
        self.additional_properties = additional_properties
        self.description = description
        self.properties = properties
        self.required = required
        self.type = type

    @staticmethod
    def from_dict(obj: Any) -> 'JSONSchema':
        assert isinstance(obj, dict)
        additional_properties = from_union([from_bool, JSONSchemaSchema.from_dict, from_none], obj.get("additionalProperties"))
        description = from_union([from_str, from_none], obj.get("description"))
        properties = from_union([lambda x: from_dict(JSONSchemaSchema.from_dict, x), from_none], obj.get("properties"))
        required = from_union([lambda x: from_list(from_str, x), from_none], obj.get("required"))
        type = from_union([TypeEnum, from_none], obj.get("type"))
        return JSONSchema(additional_properties, description, properties, required, type)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.additional_properties is not None:
            result["additionalProperties"] = from_union([from_bool, lambda x: to_class(JSONSchemaSchema, x), from_none], self.additional_properties)
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        if self.properties is not None:
            result["properties"] = from_union([lambda x: from_dict(lambda x: to_class(JSONSchemaSchema, x), x), from_none], self.properties)
        if self.required is not None:
            result["required"] = from_union([lambda x: from_list(from_str, x), from_none], self.required)
        if self.type is not None:
            result["type"] = from_union([lambda x: to_enum(TypeEnum, x), from_none], self.type)
        return result


class Tool:
    """A tool definition with input/output schemas for maritime analysis"""

    description: str
    """Human-readable description of what the tool does"""

    input_schema: JSONSchema
    """JSON Schema defining the expected input parameters"""

    name: str
    """The unique identifier/name of the tool"""

    output_schema: Optional[JSONSchema]
    """Optional JSON Schema defining the expected output format"""

    def __init__(self, description: str, input_schema: JSONSchema, name: str, output_schema: Optional[JSONSchema]) -> None:
        self.description = description
        self.input_schema = input_schema
        self.name = name
        self.output_schema = output_schema

    @staticmethod
    def from_dict(obj: Any) -> 'Tool':
        assert isinstance(obj, dict)
        description = from_str(obj.get("description"))
        input_schema = JSONSchema.from_dict(obj.get("inputSchema"))
        name = from_str(obj.get("name"))
        output_schema = from_union([JSONSchema.from_dict, from_none], obj.get("outputSchema"))
        return Tool(description, input_schema, name, output_schema)

    def to_dict(self) -> dict:
        result: dict = {}
        result["description"] = from_str(self.description)
        result["inputSchema"] = to_class(JSONSchema, self.input_schema)
        result["name"] = from_str(self.name)
        if self.output_schema is not None:
            result["outputSchema"] = from_union([lambda x: to_class(JSONSchema, x), from_none], self.output_schema)
        return result


class ToolListResponse:
    """Response format for listing available tools"""

    description: Optional[str]
    """Optional description of the tool collection"""

    tools: List[Tool]
    """Array of available tools"""

    version: Optional[str]
    """Optional version identifier for the tool collection"""

    def __init__(self, description: Optional[str], tools: List[Tool], version: Optional[str]) -> None:
        self.description = description
        self.tools = tools
        self.version = version

    @staticmethod
    def from_dict(obj: Any) -> 'ToolListResponse':
        assert isinstance(obj, dict)
        description = from_union([from_str, from_none], obj.get("description"))
        tools = from_list(Tool.from_dict, obj.get("tools"))
        version = from_union([from_str, from_none], obj.get("version"))
        return ToolListResponse(description, tools, version)

    def to_dict(self) -> dict:
        result: dict = {}
        if self.description is not None:
            result["description"] = from_union([from_str, from_none], self.description)
        result["tools"] = from_list(lambda x: to_class(Tool, x), self.tools)
        if self.version is not None:
            result["version"] = from_union([from_str, from_none], self.version)
        return result


def tool_list_response_from_dict(s: Any) -> ToolListResponse:
    return ToolListResponse.from_dict(s)


def tool_list_response_to_dict(x: ToolListResponse) -> Any:
    return to_class(ToolListResponse, x)
