"""Simplified FastMCP server for ToolVault - No SPA, Just Working MCP + REST.

This is a clean FastMCP implementation that:
1. Uses FastMCP for MCP protocol (via /mcp endpoint)
2. Adds simple REST endpoints for backward compatibility
3. No SPA, no unnecessary complexity
4. Production-ready and maintainable

Endpoints:
- POST /mcp - MCP protocol endpoint (FastMCP handles this)
- GET /health - Health check
- GET /tools/list - List all tools (backward compat)
- POST /tools/call - Execute a tool (backward compat)
"""

import sys
from typing import Any

try:
    from fastmcp import FastMCP
except ImportError:
    print("Error: fastmcp not installed. Install with: pip install fastmcp")
    sys.exit(1)

from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.routing import Route


def _import_discovery():
    """Import discovery helpers."""
    try:
        from discovery import discover_tools, generate_index_json
        return discover_tools, generate_index_json
    except ImportError:
        import importlib.util
        import os

        current_dir = os.path.dirname(os.path.abspath(__file__))
        discovery_path = os.path.join(current_dir, "discovery.py")

        if not os.path.exists(discovery_path):
            raise ImportError("Could not locate discovery module")

        spec = importlib.util.spec_from_file_location("discovery", discovery_path)
        if spec is None or spec.loader is None:
            raise ImportError("Could not load discovery module")

        module = importlib.util.module_from_spec(spec)
        sys.modules["discovery"] = module
        spec.loader.exec_module(module)

        from discovery import discover_tools, generate_index_json
        return discover_tools, generate_index_json


discover_tools, generate_index_json = _import_discovery()


class SimpleToolVaultServer:
    """Simplified ToolVault server using FastMCP."""

    def __init__(self, tools_path: str):
        """Initialize server."""
        self.tools_path = tools_path

        # Initialize FastMCP
        self.mcp = FastMCP("ToolVault")

        # Discover tools
        print("Discovering tools...")
        self.tools = discover_tools(tools_path)
        self.tools_by_name = {tool.name: tool for tool in self.tools}
        self.index_data = generate_index_json(tools_path)
        print(f"Discovered {len(self.tools)} tools")

        # Register all tools with FastMCP
        print("Registering tools with FastMCP...")
        self._register_tools()

    def _register_tools(self):
        """Register all discovered tools with FastMCP."""
        for tool in self.tools:
            # Create wrapper that FastMCP can use
            def make_wrapper(tool_meta):
                def wrapper(params):
                    """Tool wrapper for FastMCP.

                    FastMCP already deserializes and validates the Pydantic model,
                    so params will be an instance of the model, not a dict.
                    We just pass it through to the tool function.
                    """
                    # FastMCP passes the already-validated model instance
                    # No need to re-instantiate - just use it directly
                    result = tool_meta.function(params)

                    # Convert to dict
                    return result.model_dump() if hasattr(result, 'model_dump') else result

                # Set metadata for FastMCP
                wrapper.__name__ = tool_meta.name
                wrapper.__doc__ = tool_meta.description
                if tool_meta.pydantic_model:
                    wrapper.__annotations__ = {
                        'params': tool_meta.pydantic_model,
                        'return': Any
                    }
                return wrapper

            # Register with FastMCP
            self.mcp.tool()(make_wrapper(tool))
            print(f"  ✓ Registered: {tool.name}")

    def create_app(self):
        """Create Starlette app with FastMCP + custom routes."""

        # Get FastMCP app to extract routes and lifespan
        mcp_app = self.mcp.http_app()

        # Define custom routes
        async def health(request):
            """Health check endpoint."""
            return JSONResponse({
                "status": "healthy",
                "tools": len(self.tools),
                "mcp_enabled": True
            })

        async def tools_list(request):
            """List all tools - backward compatible endpoint."""
            return JSONResponse(self.index_data)

        async def tools_call(request):
            """Execute a tool - backward compatible endpoint."""
            try:
                body = await request.json()
                tool_name = body.get("name")
                arguments = body.get("arguments", {})

                tool = self.tools_by_name.get(tool_name)
                if not tool:
                    return JSONResponse(
                        {"error": f"Tool not found: {tool_name}"},
                        status_code=404
                    )

                # Convert array format to dict if needed
                if isinstance(arguments, list):
                    args_dict = {arg["name"]: arg["value"] for arg in arguments}
                else:
                    args_dict = arguments

                # Execute tool
                if tool.pydantic_model:
                    validated = tool.pydantic_model(**args_dict)
                    result = tool.function(validated)
                else:
                    result = tool.function(args_dict)

                # Convert to dict
                result_data = result.model_dump() if hasattr(result, 'model_dump') else result

                return JSONResponse({"result": result_data, "isError": False})

            except Exception as e:
                import traceback
                return JSONResponse(
                    {
                        "error": str(e),
                        "isError": True,
                        "traceback": traceback.format_exc()
                    },
                    status_code=400
                )

        async def root(request):
            """Root endpoint - server info."""
            return JSONResponse({
                "name": "ToolVault",
                "version": "1.0.0",
                "description": "FastMCP-powered tool execution server",
                "endpoints": {
                    "mcp": "/mcp (POST - MCP protocol)",
                    "health": "/health (GET)",
                    "tools_list": "/tools/list (GET)",
                    "tools_call": "/tools/call (POST)"
                },
                "tools": len(self.tools)
            })

        # Create custom routes
        custom_routes = [
            Route("/", root),
            Route("/health", health),
            Route("/tools/list", tools_list),
            Route("/tools/call", tools_call, methods=["POST"]),
        ]

        # Get FastMCP routes (already fetched at top of method)
        mcp_routes = list(mcp_app.routes)

        # Combine routes - FastMCP first, then custom
        all_routes = mcp_routes + custom_routes

        # Create app with FastMCP's lifespan (CRITICAL for FastMCP to work)
        app = Starlette(routes=all_routes, lifespan=mcp_app.router.lifespan_context)

        # Add CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Simplified for testing
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        return app


def start_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    tools_path: str = "tools"
):
    """Start the simplified FastMCP server."""
    import uvicorn

    print(f"\n{'='*70}")
    print("ToolVault Simple FastMCP Server")
    print(f"{'='*70}\n")

    # Create server
    server = SimpleToolVaultServer(tools_path)
    app = server.create_app()

    print(f"\n{'='*70}")
    print(f"Server starting on http://{host}:{port}")
    print("")
    print("Endpoints:")
    print(f"  - MCP Protocol:  POST http://{host}:{port}/mcp")
    print(f"  - Health Check:  GET  http://{host}:{port}/health")
    print(f"  - List Tools:    GET  http://{host}:{port}/tools/list")
    print(f"  - Execute Tool:  POST http://{host}:{port}/tools/call")
    print("")
    print("Test with:")
    print(f'  curl http://{host}:{port}/health')
    print(f'  curl http://{host}:{port}/tools/list | jq .')
    print(f'  curl -X POST http://{host}:{port}/tools/call \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"name":"word_count","arguments":{"text":"hello world"}}\'')
    print("")
    print(f"{'='*70}\n")

    # Run server
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ToolVault Simple FastMCP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--tools-path", default="tools", help="Path to tools directory")

    args = parser.parse_args()

    start_server(
        host=args.host,
        port=args.port,
        tools_path=args.tools_path
    )
