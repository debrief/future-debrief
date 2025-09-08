"""Tool discovery system for ToolVault packager."""

import os
import importlib.util
import inspect
import ast
from typing import Dict, Any, List, Optional, Callable, get_type_hints
from pathlib import Path


class ToolDiscoveryError(Exception):
    """Raised when tool discovery encounters an error."""
    pass


class ToolMetadata:
    """Metadata for a discovered tool."""
    
    def __init__(
        self,
        name: str,
        function: Callable,
        description: str,
        parameters: Dict[str, Any],
        return_type: str,
        module_path: str
    ):
        self.name = name
        self.function = function
        self.description = description
        self.parameters = parameters
        self.return_type = return_type
        self.module_path = module_path


def extract_function_docstring(func: Callable) -> str:
    """Extract and clean the docstring from a function."""
    doc = inspect.getdoc(func)
    if not doc:
        return f"Tool function: {func.__name__}"
    return doc.strip()


def extract_type_annotations(func: Callable) -> Dict[str, str]:
    """Extract type annotations from a function."""
    try:
        type_hints = get_type_hints(func)
        annotations = {}
        
        # Get parameter types
        sig = inspect.signature(func)
        for param_name, param in sig.parameters.items():
            if param_name in type_hints:
                annotations[param_name] = str(type_hints[param_name])
            else:
                raise ToolDiscoveryError(
                    f"Missing type annotation for parameter '{param_name}' in function '{func.__name__}'"
                )
        
        # Get return type
        if 'return' in type_hints:
            annotations['return'] = str(type_hints['return'])
        else:
            raise ToolDiscoveryError(
                f"Missing return type annotation for function '{func.__name__}'"
            )
            
        return annotations
    except Exception as e:
        raise ToolDiscoveryError(f"Failed to extract type annotations from '{func.__name__}': {e}")


def convert_python_type_to_json_schema(type_str: str) -> Dict[str, Any]:
    """Convert Python type string to JSON Schema format."""
    type_mapping = {
        "<class 'str'>": {"type": "string"},
        "<class 'int'>": {"type": "integer"},
        "<class 'float'>": {"type": "number"},
        "<class 'bool'>": {"type": "boolean"},
        "<class 'list'>": {"type": "array"},
        "<class 'dict'>": {"type": "object"},
        "typing.Dict[str, typing.Any]": {"type": "object"},
        "Dict[str, Any]": {"type": "object"},
        "typing.Any": {},
    }
    
    # Handle basic types
    if type_str in type_mapping:
        return type_mapping[type_str]
    
    # Handle more complex typing annotations
    if "Dict[str, Any]" in type_str or "dict" in type_str.lower():
        return {"type": "object"}
    elif "List" in type_str or "list" in type_str.lower():
        return {"type": "array"}
    elif "str" in type_str:
        return {"type": "string"}
    elif "int" in type_str:
        return {"type": "integer"}
    elif "float" in type_str:
        return {"type": "number"}
    elif "bool" in type_str:
        return {"type": "boolean"}
    
    # Default to object for complex types
    return {"type": "object"}


def discover_tools(tools_path: str) -> List[ToolMetadata]:
    """
    Discover tools in the specified directory.
    
    Args:
        tools_path: Path to the tools directory
        
    Returns:
        List of ToolMetadata objects for discovered tools
        
    Raises:
        ToolDiscoveryError: If discovery fails or validation errors occur
    """
    tools = []
    tools_dir = Path(tools_path)
    
    if not tools_dir.exists():
        raise ToolDiscoveryError(f"Tools directory does not exist: {tools_path}")
    
    # Find all Python files in the tools directory
    for py_file in tools_dir.glob("*.py"):
        if py_file.name.startswith("__"):
            continue  # Skip __init__.py and other special files
            
        # Load the module
        module_name = py_file.stem
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec is None or spec.loader is None:
            continue
            
        try:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        except Exception as e:
            raise ToolDiscoveryError(f"Failed to load module '{module_name}': {e}")
        
        # Find public functions in the module
        public_functions = [
            (name, obj) for name, obj in inspect.getmembers(module, inspect.isfunction)
            if not name.startswith("_") and obj.__module__ == module_name
        ]
        
        if len(public_functions) == 0:
            raise ToolDiscoveryError(f"Module '{module_name}' has no public functions")
        elif len(public_functions) > 1:
            func_names = [name for name, _ in public_functions]
            raise ToolDiscoveryError(
                f"Module '{module_name}' has multiple public functions: {func_names}. "
                f"Each tool module must have exactly one public function."
            )
        
        func_name, func = public_functions[0]
        
        # Extract metadata
        description = extract_function_docstring(func)
        type_annotations = extract_type_annotations(func)
        
        # Build parameters schema
        sig = inspect.signature(func)
        parameters = {}
        for param_name, param in sig.parameters.items():
            param_type = type_annotations.get(param_name, "object")
            param_schema = convert_python_type_to_json_schema(param_type)
            param_schema["description"] = f"Parameter {param_name}"
            parameters[param_name] = param_schema
        
        # Get return type
        return_type = type_annotations.get('return', 'object')
        
        tools.append(ToolMetadata(
            name=func_name,
            function=func,
            description=description,
            parameters=parameters,
            return_type=return_type,
            module_path=str(py_file)
        ))
    
    if not tools:
        raise ToolDiscoveryError(f"No valid tools found in: {tools_path}")
    
    return tools


def generate_index_json(tools: List[ToolMetadata]) -> Dict[str, Any]:
    """
    Generate MCP-compatible index.json from discovered tools.
    
    Args:
        tools: List of discovered tool metadata
        
    Returns:
        Dictionary representing the index.json structure
    """
    tools_list = []
    
    for tool in tools:
        tool_schema = {
            "name": tool.name,
            "description": tool.description,
            "inputSchema": {
                "type": "object",
                "properties": tool.parameters,
                "required": list(tool.parameters.keys()),
                "additionalProperties": False
            }
        }
        tools_list.append(tool_schema)
    
    return {
        "tools": tools_list,
        "version": "1.0.0",
        "description": "ToolVault packaged tools"
    }