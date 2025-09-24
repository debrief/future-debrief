"""Validation system for ToolVault tools and inputs/outputs."""

from typing import Any, Dict

try:
    from pydantic import BaseModel, ValidationError, create_model
except ImportError:
    BaseModel = None
    ValidationError = None
    create_model = None


class ToolValidationError(Exception):
    """Raised when tool validation fails."""

    pass


def validate_json_against_schema(data: Any, schema: Dict[str, Any]) -> bool:
    """
    Validate JSON data against a JSON Schema.

    This is a basic implementation. In Phase 2, this will be enhanced
    with proper Pydantic integration and shared-types schemas.

    Args:
        data: The data to validate
        schema: JSON Schema dictionary

    Returns:
        True if valid, raises exception if invalid

    Raises:
        ToolValidationError: If validation fails
    """
    # Basic type checking for now
    if "type" in schema:
        expected_type = schema["type"]

        if expected_type == "string" and not isinstance(data, str):
            raise ToolValidationError(f"Expected string, got {type(data).__name__}")
        elif expected_type == "integer" and not isinstance(data, int):
            raise ToolValidationError(f"Expected integer, got {type(data).__name__}")
        elif expected_type == "number" and not isinstance(data, (int, float)):
            raise ToolValidationError(f"Expected number, got {type(data).__name__}")
        elif expected_type == "boolean" and not isinstance(data, bool):
            raise ToolValidationError(f"Expected boolean, got {type(data).__name__}")
        elif expected_type == "array" and not isinstance(data, list):
            raise ToolValidationError(f"Expected array, got {type(data).__name__}")
        elif expected_type == "object" and not isinstance(data, dict):
            raise ToolValidationError(f"Expected object, got {type(data).__name__}")

    return True


def validate_tool_input(
    tool_name: str, arguments: Dict[str, Any], tool_schema: Dict[str, Any]
) -> bool:
    """
    Validate tool input arguments against the tool's schema.

    Args:
        tool_name: Name of the tool
        arguments: Input arguments to validate
        tool_schema: Tool's input schema

    Returns:
        True if valid

    Raises:
        ToolValidationError: If validation fails
    """
    if "inputSchema" not in tool_schema:
        return True  # No schema to validate against

    input_schema = tool_schema["inputSchema"]

    # Check required parameters
    required_params = input_schema.get("required", [])
    for param in required_params:
        if param not in arguments:
            raise ToolValidationError(
                f"Missing required parameter '{param}' for tool '{tool_name}'"
            )

    # Validate each parameter
    properties = input_schema.get("properties", {})
    for param_name, param_value in arguments.items():
        if param_name in properties:
            param_schema = properties[param_name]
            try:
                validate_json_against_schema(param_value, param_schema)
            except ToolValidationError as e:
                raise ToolValidationError(f"Parameter '{param_name}' validation failed: {e}")

    return True


def validate_tool_output(
    tool_name: str, result: Any, tool_schema: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Validate and wrap tool output according to MCP specification.

    Args:
        tool_name: Name of the tool
        result: Tool execution result
        tool_schema: Tool's output schema (optional)

    Returns:
        Wrapped result dictionary

    Raises:
        ToolValidationError: If validation fails
    """
    # For now, just wrap the result
    # In Phase 2, this will include proper schema validation
    wrapped_result = {"result": result, "isError": False}

    return wrapped_result


class ToolExecutionValidator:
    """Validator for tool execution with caching and performance optimization."""

    def __init__(self, tools_metadata: Dict[str, Dict[str, Any]]):
        """
        Initialize validator with tools metadata.

        Args:
            tools_metadata: Dictionary mapping tool names to their metadata
        """
        self.tools_metadata = tools_metadata
        self._validation_cache = {}

    def validate_and_execute(
        self, tool_name: str, tool_function, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate arguments and execute tool with proper error handling.

        Args:
            tool_name: Name of the tool
            tool_function: The tool function to execute
            arguments: Input arguments

        Returns:
            Validated and wrapped result

        Raises:
            ToolValidationError: If validation or execution fails
        """
        # Validate inputs
        if tool_name in self.tools_metadata:
            tool_schema = self.tools_metadata[tool_name]
            validate_tool_input(tool_name, arguments, tool_schema)

        try:
            # Execute the tool
            result = tool_function(**arguments)

            # Validate and wrap output
            return validate_tool_output(tool_name, result)

        except Exception as e:
            # Handle execution errors
            raise ToolValidationError(f"Tool '{tool_name}' execution failed: {str(e)}")


def create_pydantic_validator(schema: Dict[str, Any], model_name: str = "ToolModel"):
    """
    Create a Pydantic model from JSON Schema (placeholder for Phase 2).

    Args:
        schema: JSON Schema dictionary
        model_name: Name for the Pydantic model

    Returns:
        Pydantic model class or None if not available
    """
    if BaseModel is None or create_model is None:
        return None

    # This is a placeholder implementation
    # In Phase 2, this will be properly implemented with shared-types integration
    return None
