"""Hybrid FastMCP + Custom Routes server for ToolVault.

This implementation uses FastMCP for MCP protocol handling while preserving
critical custom features like SPA integration, static file serving, and rich
metadata (samples, source code, git history).

Architecture:
- FastMCP: Handles MCP protocol (tools/list, tools/call, /sse endpoint)
- Custom Routes: SPA serving, samples, metadata, static files
- Discovery: Existing discovery.py for tool metadata extraction

This gives us:
✅ MCP protocol compliance from FastMCP
✅ Reduced protocol boilerplate
✅ SPA integration preserved
✅ Rich metadata features preserved
✅ Best of both worlds
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

try:
    from fastmcp import FastMCP
except ImportError:
    print("Error: fastmcp not installed. Install with: pip install fastmcp")
    sys.exit(1)

from starlette.applications import Starlette
from starlette.responses import FileResponse, JSONResponse, Response
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware


def _import_discovery():
    """Import discovery helpers with fallbacks."""
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


class HybridToolVaultServer:
    """
    Hybrid server combining FastMCP protocol with custom features.

    FastMCP provides:
    - MCP protocol compliance
    - Automatic tool registration and schema generation
    - SSE transport support

    Custom features:
    - SPA static file serving
    - Tool samples serving
    - Source code viewing
    - Git history
    - Health checks
    - Backward compatibility
    """

    def __init__(self, tools_path: str):
        """Initialize hybrid server."""
        self.tools_path = tools_path

        # Initialize FastMCP
        self.mcp = FastMCP("ToolVault")

        # Discover tools using existing discovery system
        print("Discovering tools...")
        self.tools = discover_tools(tools_path)
        self.tools_by_name = {tool.name: tool for tool in self.tools}
        self.index_data = generate_index_json(tools_path)
        print(f"Discovered {len(self.tools)} tools")

        # Register all tools with FastMCP
        print("Registering tools with FastMCP...")
        self._register_tools()

        # Prepare sample lookups
        self._prepare_samples()

    def _register_tools(self):
        """Register all discovered tools with FastMCP."""
        for tool in self.tools:
            # Create a wrapper function for each tool
            # FastMCP will handle schema generation from the Pydantic model

            # We need to create a closure that captures the tool
            def make_tool_wrapper(tool_meta):
                def tool_wrapper(params):
                    """Dynamically generated tool wrapper."""
                    # Validate params with Pydantic model
                    if tool_meta.pydantic_model:
                        validated_params = tool_meta.pydantic_model(**params)
                        result = tool_meta.function(validated_params)
                    else:
                        result = tool_meta.function(params)

                    # Convert result to dict if it's a Pydantic model
                    if hasattr(result, 'model_dump'):
                        return result.model_dump()
                    return result

                # Set proper metadata for FastMCP
                tool_wrapper.__name__ = tool_meta.name
                tool_wrapper.__doc__ = tool_meta.description

                # Set annotations for FastMCP schema generation
                if tool_meta.pydantic_model:
                    tool_wrapper.__annotations__ = {
                        'params': tool_meta.pydantic_model,
                        'return': Any
                    }

                return tool_wrapper

            # Create and register the wrapper
            wrapper = make_tool_wrapper(tool)
            self.mcp.tool()(wrapper)

            print(f"  ✓ Registered: {tool.name}")

    def _prepare_samples(self):
        """Prepare sample file lookups."""
        self.samples_by_tool = {}
        self.samples_by_name = {}

        for tool in self.tools:
            samples_dir = Path(tool.tool_dir) / "samples"
            if not samples_dir.exists():
                continue

            file_map = {}
            for sample_path in samples_dir.glob("*.json"):
                file_map[sample_path.name] = sample_path
                self.samples_by_name.setdefault(sample_path.name, sample_path)

            if file_map:
                self.samples_by_tool[tool.name] = file_map

    def _create_custom_routes(self):
        """Create custom Starlette routes for SPA and metadata."""

        async def root(request):
            """Root endpoint with server info."""
            return JSONResponse({
                "name": "ToolVault Hybrid Server",
                "version": "1.0.0",
                "description": "FastMCP + Custom Routes",
                "endpoints": {
                    "mcp": "/sse (SSE transport)",
                    "tools_list": "/tools/list (backward compat)",
                    "tools_call": "/tools/call (backward compat)",
                    "ui": "/ui/",
                    "health": "/health"
                }
            })

        async def health(request):
            """Health check endpoint."""
            return JSONResponse({
                "status": "healthy",
                "tools": len(self.tools),
                "mcp_enabled": True
            })

        async def tools_list(request):
            """Backward compatible /tools/list endpoint."""
            return JSONResponse(self.index_data)

        async def tools_call(request):
            """Backward compatible /tools/call endpoint."""
            body = await request.json()
            tool_name = body.get("name")
            arguments = body.get("arguments", {})

            tool = self.tools_by_name.get(tool_name)
            if not tool:
                return JSONResponse(
                    {"error": f"Tool not found: {tool_name}"},
                    status_code=404
                )

            try:
                # Validate with Pydantic model
                if tool.pydantic_model:
                    # Convert array format to dict if needed
                    if isinstance(arguments, list):
                        args_dict = {arg["name"]: arg["value"] for arg in arguments}
                    else:
                        args_dict = arguments

                    validated_params = tool.pydantic_model(**args_dict)
                    result = tool.function(validated_params)
                else:
                    result = tool.function(arguments)

                # Convert to dict
                if hasattr(result, 'model_dump'):
                    result_data = result.model_dump()
                else:
                    result_data = result

                return JSONResponse({"result": result_data, "isError": False})

            except Exception as e:
                return JSONResponse(
                    {"error": str(e), "isError": True},
                    status_code=400
                )

        async def serve_sample(request):
            """Serve tool sample files."""
            tool_name = request.path_params['tool_name']
            sample_file = request.path_params['sample_file']

            if tool_name in self.samples_by_tool:
                sample_path = self.samples_by_tool[tool_name].get(sample_file)
                if sample_path and sample_path.exists():
                    return FileResponse(sample_path)

            return Response("Sample not found", status_code=404)

        async def serve_tool_file(request):
            """Serve tool files (source, schemas, etc.)."""
            full_path = request.path_params['full_path']
            tool_dir = Path(self.tools_path)
            file_path = tool_dir / full_path

            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)

            return Response("File not found", status_code=404)

        # Build routes
        routes = [
            Route("/", root),
            Route("/health", health),
            Route("/tools/list", tools_list),
            Route("/tools/call", tools_call, methods=["POST"]),
            Route("/api/tools/{tool_name}/samples/{sample_file}", serve_sample),
            Route("/api/tools/{full_path:path}", serve_tool_file),
        ]

        # Add static file serving for SPA if dist exists
        spa_dist = Path("spa/dist")
        if spa_dist.exists():
            routes.append(Mount("/ui", StaticFiles(directory=str(spa_dist), html=True)))
            print("✓ SPA static files mounted at /ui/")
        else:
            print("⚠ SPA dist directory not found, skipping SPA serving")

        return routes

    def create_app(self):
        """Create the hybrid Starlette application."""
        # Use FastMCP's HTTP app (modern, not deprecated SSE)
        mcp_app = self.mcp.http_app()

        # Create custom routes
        custom_routes = self._create_custom_routes()

        # Combine: FastMCP handles MCP protocol, custom routes handle everything else
        # FastMCP routes take precedence (they're registered first)
        combined_routes = list(mcp_app.routes) + custom_routes

        # Create new app with combined routes (don't copy middleware, add our own)
        app = Starlette(routes=combined_routes)

        # Add CORS for SPA
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["*"],
        )

        return app


def start_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    tools_path: str = "tools"
):
    """
    Start the hybrid FastMCP + Custom Routes server.

    Args:
        host: Server host
        port: Server port
        tools_path: Path to tools directory
    """
    import uvicorn

    print(f"\n{'='*70}")
    print(f"ToolVault Hybrid Server (FastMCP + Custom Routes)")
    print(f"{'='*70}\n")

    # Create hybrid server
    server = HybridToolVaultServer(tools_path)
    app = server.create_app()

    print(f"\n{'='*70}")
    print(f"Server starting on http://{host}:{port}")
    print(f"")
    print(f"MCP Endpoints:")
    print(f"  - SSE Transport: http://{host}:{port}/sse")
    print(f"")
    print(f"Backward Compatible Endpoints:")
    print(f"  - Tools List: http://{host}:{port}/tools/list")
    print(f"  - Tools Call: http://{host}:{port}/tools/call")
    print(f"  - Web UI: http://{host}:{port}/ui/")
    print(f"  - Health: http://{host}:{port}/health")
    print(f"")
    print(f"{'='*70}\n")

    # Run server
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ToolVault Hybrid Server")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--tools-path", default="tools", help="Path to tools directory")

    args = parser.parse_args()

    start_server(
        host=args.host,
        port=args.port,
        tools_path=args.tools_path
    )
