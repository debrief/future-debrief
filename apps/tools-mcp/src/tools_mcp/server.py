"""FastMCP server for maritime analysis tools."""

import importlib
import inspect
from pathlib import Path
from typing import Any, Callable, Dict, get_type_hints

from fastmcp import FastMCP
from pydantic import BaseModel

from debrief.types.tools import DebriefCommand

# Initialize FastMCP server
mcp = FastMCP("Maritime Analysis Tools 🚢")


def discover_tools(tools_dir: Path) -> Dict[str, tuple[Callable, BaseModel]]:
    """
    Discover all tools in the tools directory.

    Each tool is expected to be in a subdirectory with an execute.py file
    containing a single public function that takes a Pydantic parameters model
    and returns a DebriefCommand.

    Args:
        tools_dir: Path to the tools directory

    Returns:
        Dictionary mapping tool names to (function, parameter_model) tuples
    """
    tools = {}

    # Iterate through all subdirectories
    for category_dir in tools_dir.iterdir():
        if not category_dir.is_dir() or category_dir.name.startswith("_"):
            continue

        # Iterate through tool directories within each category
        for tool_dir in category_dir.iterdir():
            if not tool_dir.is_dir() or tool_dir.name.startswith("_"):
                continue

            execute_file = tool_dir / "execute.py"
            if not execute_file.exists():
                continue

            # Import the execute module
            module_path = f"tools_mcp.tools.{category_dir.name}.{tool_dir.name}.execute"
            try:
                module = importlib.import_module(module_path)

                # Find the public function (not starting with _)
                public_functions = [
                    (name, obj) for name, obj in inspect.getmembers(module, inspect.isfunction)
                    if not name.startswith("_") and obj.__module__ == module.__name__
                ]

                if len(public_functions) != 1:
                    print(f"Warning: {module_path} should have exactly one public function, found {len(public_functions)}")
                    continue

                func_name, func = public_functions[0]

                # Get the parameter type from type hints
                type_hints = get_type_hints(func)
                if "params" not in type_hints:
                    print(f"Warning: {func_name} should have a 'params' parameter")
                    continue

                param_type = type_hints["params"]
                if not issubclass(param_type, BaseModel):
                    print(f"Warning: {func_name} params should be a Pydantic BaseModel")
                    continue

                # Store the tool with a unique name
                tool_name = f"{category_dir.name}_{tool_dir.name}"
                tools[tool_name] = (func, param_type)
                print(f"Discovered tool: {tool_name}")

            except Exception as e:
                print(f"Error loading tool {tool_dir}: {e}")

    return tools


def register_tool(name: str, func: Callable, param_model: type[BaseModel]) -> None:
    """
    Register a tool with FastMCP.

    Args:
        name: Name of the tool
        func: Tool function
        param_model: Pydantic parameter model class
    """
    # Extract docstring from the original function
    doc = inspect.getdoc(func) or "No description available"

    # Create a wrapper function that takes a single parameter model argument
    # This is the simplest approach that works with FastMCP
    def tool_wrapper(params: param_model) -> Dict[str, Any]:  # type: ignore[valid-type]
        """Wrapper function for FastMCP tool execution."""
        try:
            # Call the tool function with the parameter model
            result = func(params)

            # Convert DebriefCommand to dict
            if isinstance(result, DebriefCommand):
                return result.model_dump()
            elif isinstance(result, dict):
                return result
            else:
                return {"command": "showText", "payload": str(result)}

        except Exception as e:
            # Return error as showText command
            import traceback
            return {
                "command": "showText",
                "payload": f"Error executing {name}: {str(e)}\n{traceback.format_exc()}"
            }

    # Update wrapper metadata
    tool_wrapper.__name__ = name
    tool_wrapper.__doc__ = doc

    # Register with FastMCP
    mcp.tool(tool_wrapper)


def initialize_server() -> FastMCP:
    """
    Initialize the FastMCP server with all discovered tools.

    Returns:
        Configured FastMCP instance
    """
    # Find tools directory
    tools_dir = Path(__file__).parent / "tools"

    if not tools_dir.exists():
        print(f"Warning: Tools directory not found at {tools_dir}")
        return mcp

    # Discover and register tools
    tools = discover_tools(tools_dir)
    print(f"Found {len(tools)} tools")

    for tool_name, (func, param_model) in tools.items():
        register_tool(tool_name, func, param_model)

    return mcp


# Initialize server on module import
server = initialize_server()


def main() -> None:
    """Run the FastMCP server."""
    server.run()


if __name__ == "__main__":
    main()
