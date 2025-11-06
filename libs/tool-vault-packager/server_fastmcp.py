"""FastMCP-based server for ToolVault runtime.

This is a trial implementation using the FastMCP framework instead of
the custom FastAPI + manual MCP implementation. It aims to simplify
the server code by leveraging FastMCP's built-in features:

- Automatic schema generation from type hints
- Decorator-based tool registration
- Built-in MCP protocol handling
- SSE transport support

Comparison with server.py:
- Much simpler tool registration (decorators vs manual discovery)
- Auto schema generation (vs manual JSON schema generation)
- Built-in MCP compliance (vs custom JSON-RPC implementation)
- Less code to maintain
"""

import sys
from pathlib import Path

try:
    from fastmcp import FastMCP
except ImportError:
    print("Error: fastmcp not installed. Install with: pip install fastmcp")
    sys.exit(1)



# Initialize FastMCP server
mcp = FastMCP(
    name="ToolVault",
    version="1.0.0",
    description="Maritime analysis tools via Model Context Protocol"
)


def load_and_register_tools(tools_path: str = "tools"):
    """
    Dynamically discover and register all tools with FastMCP.

    This function walks the tools directory, finds all execute.py files,
    imports the tool functions, and registers them with FastMCP using
    the @mcp.tool decorator programmatically.

    Args:
        tools_path: Path to tools directory
    """
    import importlib.util
    import inspect

    tools_dir = Path(tools_path)

    if not tools_dir.exists():
        print(f"Warning: Tools directory not found: {tools_dir}")
        return

    tool_count = 0

    # Find all execute.py files
    for execute_file in tools_dir.rglob("execute.py"):
        try:
            # Get relative path and construct module path
            rel_path = execute_file.relative_to(tools_dir.parent)
            module_path = str(rel_path.with_suffix('')).replace('/', '.')

            # Import the module
            spec = importlib.util.spec_from_file_location(module_path, execute_file)
            if not spec or not spec.loader:
                continue

            module = importlib.util.module_from_spec(spec)
            sys.modules[module_path] = module
            spec.loader.exec_module(module)

            # Find the tool function (should be the only public function)
            for name, obj in inspect.getmembers(module):
                if (inspect.isfunction(obj) and
                    not name.startswith('_') and
                    obj.__module__ == module_path):

                    # Register with FastMCP
                    mcp.tool()(obj)
                    tool_count += 1

                    # Get tool category from path
                    parts = execute_file.parent.relative_to(tools_dir).parts
                    category = '/'.join(parts) if parts else 'general'

                    print(f"  ✓ Registered: {name} ({category})")

        except Exception as e:
            print(f"  ✗ Failed to load {execute_file}: {e}")
            continue

    print(f"\nLoaded {tool_count} tools")


def start_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    tools_path: str = "tools",
    with_sse: bool = True
):
    """
    Start the FastMCP server with SSE transport.

    Args:
        host: Server host (default: 0.0.0.0)
        port: Server port (default: 8000)
        tools_path: Path to tools directory
        with_sse: Enable SSE transport for web clients (default: True)
    """
    import uvicorn

    print(f"\n{'='*60}")
    print("Starting ToolVault FastMCP Server")
    print(f"{'='*60}\n")

    # Load and register all tools
    print("Loading tools...")
    load_and_register_tools(tools_path)

    print(f"\nStarting server on {host}:{port}")

    if with_sse:
        print(f"SSE endpoint: http://{host}:{port}/sse")

    print(f"\n{'='*60}\n")

    # Create Starlette app from FastMCP
    app = mcp.get_starlette_app()

    # Run with uvicorn
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )


if __name__ == "__main__":
    """Run server directly for testing."""
    import argparse

    parser = argparse.ArgumentParser(description="ToolVault FastMCP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--tools-path", default="tools", help="Path to tools directory")
    parser.add_argument("--no-sse", action="store_true", help="Disable SSE transport")

    args = parser.parse_args()

    start_server(
        host=args.host,
        port=args.port,
        tools_path=args.tools_path,
        with_sse=not args.no_sse
    )
