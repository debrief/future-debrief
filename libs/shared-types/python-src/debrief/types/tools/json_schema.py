"""JSONSchema Pydantic model for JSON Schema definitions."""

from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel


class JSONSchemaType(str, Enum):
    """Valid JSON Schema types."""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    NULL = "null"


class JSONSchemaProperty(BaseModel):
    """A JSON Schema property definition."""
    type: Optional[JSONSchemaType] = None
    description: Optional[str] = None
    enum: Optional[List[Any]] = None
    items: Optional['JSONSchemaProperty'] = None
    properties: Optional[Dict[str, 'JSONSchemaProperty']] = None
    required: Optional[List[str]] = None
    additionalProperties: Optional[Union[bool, 'JSONSchemaProperty']] = None
    default: Optional[Any] = None

    class Config:
        extra = "allow"  # Allow additional properties


class JSONSchema(BaseModel):
    """A JSON Schema object for defining data structure constraints."""
    type: Optional[JSONSchemaType] = None
    properties: Optional[Dict[str, JSONSchemaProperty]] = None
    required: Optional[List[str]] = None
    additionalProperties: Optional[Union[bool, JSONSchemaProperty]] = None
    description: Optional[str] = None

    class Config:
        extra = "allow"  # Allow additional properties


# Update forward references
JSONSchemaProperty.model_rebuild()
