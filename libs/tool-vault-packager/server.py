"""FastAPI server for ToolVault runtime with MCP-compatible endpoints."""

import json
import sys
import traceback
from pathlib import Path
from typing import Any, Dict, Optional, Union, cast

from debrief.types.tools import ToolCallRequest
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


def _import_discovery() -> tuple[Any, Any]:
    """Import discovery helpers with fallbacks for packaged execution."""

    try:
        from discovery import (
            discover_tools as discover,
        )
        from discovery import (
            generate_index_json as generate,
        )

        return discover, generate
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

        from discovery import (
            discover_tools as discover,
        )
        from discovery import (
            generate_index_json as generate,
        )

        return discover, generate


discover_tools, generate_index_json = _import_discovery()


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    details: Optional[str] = None


class MCPRequest(BaseModel):
    """MCP JSON-RPC 2.0 request model."""

    jsonrpc: str
    id: Union[int, None]
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPError(BaseModel):
    """MCP JSON-RPC 2.0 error object."""

    code: int
    message: str
    data: Optional[Any] = None


class MCPResponse(BaseModel):
    """MCP JSON-RPC 2.0 response model."""

    jsonrpc: str = "2.0"
    id: Union[int, None]
    result: Optional[Any] = None
    error: Optional[MCPError] = None


class ToolVaultServer:
    """ToolVault FastAPI server implementation."""

    def __init__(self, tools_path: str):
        """Initialize the server with tools from the specified path."""
        # Store tools_path for use in endpoints
        self.tools_path = tools_path

        self.app = FastAPI(
            title="ToolVault Server",
            description="MCP-compatible tool execution server",
            version="1.0.0",
        )

        # Add CORS middleware to allow cross-origin requests from SPA
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["*"],
        )

        # Detect runtime context first
        self._running_from_archive = hasattr(sys, "_MEIPASS") or str(sys.argv[0]).endswith(".pyz")

        # Load or generate tool index
        try:
            if self._running_from_archive:
                # Running from .pyz package - load pre-built index (fast path, no discovery!)
                import zipfile

                # Get the path to the current .pyz file
                pyz_path = sys.argv[0] if str(sys.argv[0]).endswith(".pyz") else None
                if pyz_path:
                    with zipfile.ZipFile(pyz_path, "r") as archive:
                        index_content = archive.read("index.json").decode("utf-8")
                        self.index_data = json.loads(index_content)
                        print("Loaded pre-built index from package")
                else:
                    # Fallback for other archive modes
                    with open("index.json", "r") as f:
                        self.index_data = json.load(f)
                        print("Loaded pre-built index from file")

                # In production mode, we don't run discover_tools() at all!
                # Tools are lazy-loaded on-demand from index metadata
                self.tools = []
                self.tools_by_name = {}

                # Extract tool count from tree for logging
                def count_tools_in_tree(nodes):
                    count = 0
                    for node in nodes:
                        if node.get("type") == "tool":
                            count += 1
                        elif node.get("type") == "category":
                            count += count_tools_in_tree(node.get("children", []))
                    return count

                tool_count = count_tools_in_tree(self.index_data.get("root", []))
                print(f"Loaded index with {tool_count} tools (lazy loading enabled)")
            else:
                # Development mode - discover tools and generate index
                self.tools = discover_tools(tools_path)
                self.tools_by_name = {tool.name: tool for tool in self.tools}
                self.index_data = generate_index_json(tools_path)
                print(f"Generated index for {len(self.tools)} tools")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize tools: {e}")

        # Pre-compute sample lookups when serving from the filesystem
        self.samples_by_tool: dict[str, dict[str, Path]] = {}
        self.samples_by_name: dict[str, Path] = {}
        if not self._running_from_archive:
            for tool in self.tools:
                samples_dir = Path(tool.tool_dir) / "samples"
                if not samples_dir.exists():
                    continue

                file_map: dict[str, Path] = {}
                for sample_path in samples_dir.glob("*.json"):
                    file_map[sample_path.name] = sample_path
                    self.samples_by_name.setdefault(sample_path.name, sample_path)

                if file_map:
                    self.samples_by_tool[tool.name] = file_map

        # Setup static files for SPA
        self._setup_static_files()

        # Setup routes
        self._setup_routes()

    def _lazy_load_tool(self, tool_name: str):
        """
        Lazy-load a tool on-demand from index metadata.
        Only used in production mode (packaged .pyz).

        Returns the ToolMetadata object for execution.
        """
        # Check if already loaded
        if tool_name in self.tools_by_name:
            return self.tools_by_name[tool_name]

        # Find tool in index
        def find_tool_in_tree(nodes, name):
            for node in nodes:
                if node.get("type") == "tool" and node.get("name") == name:
                    return node
                elif node.get("type") == "category":
                    result = find_tool_in_tree(node.get("children", []), name)
                    if result:
                        return result
            return None

        tool_data = find_tool_in_tree(self.index_data.get("root", []), tool_name)
        if not tool_data:
            return None

        # Import the tool module and get the function
        module_path = tool_data.get("module_path")
        function_name = tool_data.get("function_name")

        if not module_path or not function_name:
            print(f"Warning: Tool '{tool_name}' missing module_path or function_name in index")
            return None

        try:
            import importlib

            module = importlib.import_module(module_path)
            function = getattr(module, function_name)

            # Detect Pydantic parameter model from function signature
            from discovery import PydanticModelType, detect_pydantic_parameter_model

            pydantic_model_raw = detect_pydantic_parameter_model(function, module)

            if not pydantic_model_raw:
                print(f"Warning: Tool '{tool_name}' has no Pydantic parameter model")
                return None

            # Cast to PydanticModelType for type safety
            pydantic_model = cast(PydanticModelType, pydantic_model_raw)

            # Extract metadata from index
            description = tool_data.get("description", "")
            input_schema = tool_data.get("inputSchema", {})

            # Convert JSON schema to parameters dict
            parameters = {}
            if input_schema and "properties" in input_schema:
                for param_name, param_info in input_schema["properties"].items():
                    parameters[param_name] = {
                        "type": param_info.get("type", "any"),
                        "description": param_info.get("description", ""),
                        "required": param_name in input_schema.get("required", []),
                    }

            # Create ToolMetadata object with required fields
            from discovery import ToolMetadata

            tool_metadata = ToolMetadata(
                name=tool_name,
                function=function,
                description=description,
                parameters=parameters,
                return_type="dict",  # Default assumption for output
                module_path=module_path,
                tool_dir=str(Path("tools") / tool_name),
                pydantic_model=pydantic_model,
            )

            # Cache it
            self.tools_by_name[tool_name] = tool_metadata
            return tool_metadata

        except Exception as e:
            print(f"Error lazy-loading tool '{tool_name}': {e}")
            import traceback

            traceback.print_exc()
            return None

    def _setup_static_files(self):
        """Setup static file serving for SPA."""
        import sys

        # Check if running from a .pyz file
        if str(sys.argv[0]).endswith(".pyz"):
            # Running from packaged archive - need to handle static files differently
            print("Detected packaged mode - setting up archive static file serving")
            self._setup_archive_static_files()
        else:
            # Running from extracted files - use normal static file serving
            current_dir = Path(__file__).parent

            # Check if we're in package development mode (tmp_package_contents exists)
            tmp_static = current_dir / "tmp_package_contents" / "static"
            if tmp_static.exists():
                static_dir = tmp_static
            else:
                # Development mode - use spa/dist
                static_dir = current_dir / "spa" / "dist"

            if static_dir.exists():
                # Mount static files at /ui/
                self.app.mount("/ui", StaticFiles(directory=str(static_dir), html=True), name="spa")
                print(f"SPA mounted at /ui/ serving from: {static_dir}")
            else:
                print("Warning: No SPA static files found")

    def _setup_archive_static_files(self):
        """Setup static file serving from within a .pyz archive."""
        import sys
        import zipfile

        try:
            # Get the .pyz file path
            pyz_path = sys.argv[0]

            # Read files from archive
            with zipfile.ZipFile(pyz_path, "r") as zf:
                static_files = {}

                # Find all static files in the archive
                for file_info in zf.infolist():
                    if file_info.filename.startswith("static/"):
                        # Read the file content
                        static_files[file_info.filename] = zf.read(file_info.filename)

                if static_files:
                    # Set up custom route handlers for static files
                    self._setup_archive_routes(static_files)
                    print(f"SPA mounted at /ui/ serving {len(static_files)} files from archive")
                else:
                    print("Warning: No static files found in archive")

        except Exception as e:
            print(f"Error setting up archive static files: {e}")

    def _setup_archive_routes(self, static_files: dict):
        """Set up route handlers for static files from archive."""
        from fastapi.responses import Response

        @self.app.get("/ui/")
        @self.app.get("/ui/{file_path:path}")
        async def serve_spa_files(file_path: str = "index.html"):
            """Serve SPA files from the archive."""

            # Handle root path
            if file_path == "" or file_path == "/":
                file_path = "index.html"

            # Build the full path
            full_path = f"static/{file_path}"

            if full_path in static_files:
                content = static_files[full_path]

                # Determine content type
                content_type = "text/html"
                if file_path.endswith(".js"):
                    content_type = "application/javascript"
                elif file_path.endswith(".css"):
                    content_type = "text/css"
                elif file_path.endswith(".svg"):
                    content_type = "image/svg+xml"
                elif file_path.endswith(".png"):
                    content_type = "image/png"
                elif file_path.endswith(".ico"):
                    content_type = "image/x-icon"

                return Response(content=content, media_type=content_type)
            else:
                # For SPA routing, serve index.html for unknown paths
                if "static/index.html" in static_files:
                    return Response(
                        content=static_files["static/index.html"], media_type="text/html"
                    )
                else:
                    raise HTTPException(status_code=404, detail="File not found")

    def _setup_routes(self):
        """Setup FastAPI routes."""

        @self.app.get("/")
        async def root():
            """Root endpoint providing basic server information and API discovery."""
            return {
                "name": "ToolVault Server",
                "version": "1.0.0",
                "status": "running",
                "tools_count": len(self.tools),
                "endpoints": {
                    "tools": "/tools/list",
                    "call": "/tools/call",
                    "ui": "/ui/",
                    "health": "/health",
                    "shutdown": "/shutdown",
                },
            }

        @self.app.get("/tools/list")
        async def list_tools():
            """MCP-compatible tools list endpoint."""
            try:
                return JSONResponse(content=self.index_data)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to list tools: {str(e)}")

        @self.app.post("/tools/call")
        async def call_tool(request: ToolCallRequest):
            """MCP-compatible tool call endpoint."""
            tool_name = request.name

            # In production mode, lazy-load tool if not already loaded
            if self._running_from_archive and tool_name not in self.tools_by_name:
                tool = self._lazy_load_tool(tool_name)
                if tool is None:
                    raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
            elif tool_name not in self.tools_by_name:
                raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
            else:
                tool = self.tools_by_name[tool_name]

            if tool.pydantic_model is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"Tool '{tool_name}' is missing its parameter model",
                )

            try:
                # Convert arguments to Pydantic parameter object
                kwargs = {}
                for arg in request.arguments:
                    kwargs[arg.name] = arg.value
                # Create Pydantic parameter object and call function
                params_obj = tool.pydantic_model(**kwargs)
                result = tool.function(params_obj)

                # Handle different result types
                if hasattr(result, "model_dump"):
                    # It's a Pydantic model (like DebriefCommand)
                    command_result = result.model_dump()
                elif isinstance(result, dict) and "command" in result:
                    # It's already a dict with command structure
                    command_result = result
                else:
                    # Wrap non-command results as showText for backward compatibility
                    if isinstance(result, (str, int, float, bool)):
                        command_result = {"command": "showText", "payload": str(result)}
                    else:
                        command_result = {"command": "showData", "payload": result}

                # Return according to new schema format
                return JSONResponse(content={"result": command_result, "isError": False})

            except TypeError as e:
                # Handle argument validation errors
                raise HTTPException(
                    status_code=400, detail=f"Invalid arguments for tool '{tool_name}': {str(e)}"
                )
            except Exception as e:
                # Handle tool execution errors
                error_details = traceback.format_exc()
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": f"Tool execution failed: {str(e)}",
                        "details": error_details,
                        "isError": True,
                    },
                )

        def _load_json_from_archive(inner_path: str) -> JSONResponse:
            import zipfile

            try:
                pyz_path = sys.argv[0]
                with zipfile.ZipFile(pyz_path, "r") as zf:
                    if inner_path in zf.namelist():
                        content = zf.read(inner_path).decode("utf-8")
                        return JSONResponse(content=json.loads(content))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=500, detail=f"Invalid JSON in sample file: {exc}")
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Error reading archive: {exc}")

            raise HTTPException(status_code=404, detail=f"File '{inner_path}' not found")

        @self.app.get("/api/tools/{tool_name}/samples/{sample_file}")
        async def get_tool_sample(tool_name: str, sample_file: str):
            """Serve a specific sample file for a tool."""

            if self._running_from_archive:
                return _load_json_from_archive(f"tools/{tool_name}/samples/{sample_file}")

            sample_map = self.samples_by_tool.get(tool_name, {})
            file_path = sample_map.get(sample_file)
            if file_path is None or not file_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"Sample file '{sample_file}' not found for tool '{tool_name}'",
                )

            try:
                content = file_path.read_text(encoding="utf-8")
                return JSONResponse(content=json.loads(content))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=500, detail=f"Invalid JSON in sample file: {exc}")
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Error reading sample file: {exc}")

        @self.app.get("/api/tools/{full_path:path}")
        async def get_tool_file(full_path: str):
            """Serve any file from the tools directory structure."""
            import sys

            # Check if running from a .pyz file
            if hasattr(sys, "_MEIPASS") or str(sys.argv[0]).endswith(".pyz"):
                # Running from packaged archive - read from zip
                import zipfile

                try:
                    pyz_path = sys.argv[0]
                    with zipfile.ZipFile(pyz_path, "r") as zf:
                        tools_file_path = f"tools/{full_path}"
                        if tools_file_path in zf.namelist():
                            content = zf.read(tools_file_path).decode("utf-8")

                            # Determine content type and serve file
                            if full_path.endswith(".html"):
                                return HTMLResponse(content=content)
                            elif full_path.endswith(".json"):
                                return JSONResponse(content=json.loads(content))
                            elif full_path.endswith(".py"):
                                return PlainTextResponse(content=content, media_type="text/plain")
                            else:
                                # Default to plain text for other file types
                                return PlainTextResponse(content=content, media_type="text/plain")
                        else:
                            raise HTTPException(
                                status_code=404, detail=f"File '{full_path}' not found in archive"
                            )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Error reading from archive: {e}")
            else:
                # Running from file system
                # Get the base tools directory from discovery
                if self.tools:
                    # Use the parent directory of any tool to find the tools root
                    sample_tool_dir = Path(self.tools[0].tool_dir)
                    if "tools" in sample_tool_dir.parts:
                        tools_index = sample_tool_dir.parts.index("tools")
                        tools_root = Path(*sample_tool_dir.parts[: tools_index + 1])
                    else:
                        tools_root = sample_tool_dir.parent

                    # Check if we should use tmp_package_contents instead (development mode)
                    current_dir = Path(__file__).parent
                    tmp_tools = current_dir / "tmp_package_contents" / "tools"
                    if tmp_tools.exists():
                        tools_root = tmp_tools
                else:
                    raise HTTPException(status_code=500, detail="No tools available")

                # Construct the full file path
                requested_file = tools_root / full_path

                # Security check - ensure file is within tools directory
                try:
                    requested_file.resolve().relative_to(tools_root.resolve())
                except ValueError:
                    raise HTTPException(
                        status_code=403, detail="Access denied - path outside tools directory"
                    )

                # Check if file exists
                if not requested_file.exists():
                    raise HTTPException(status_code=404, detail=f"File '{full_path}' not found")

                # Determine content type and serve file
                if full_path.endswith(".html"):
                    content = requested_file.read_text(encoding="utf-8")
                    return HTMLResponse(content=content)
                elif full_path.endswith(".json"):
                    content = requested_file.read_text(encoding="utf-8")
                    return JSONResponse(content=json.loads(content))
                elif full_path.endswith(".py"):
                    content = requested_file.read_text(encoding="utf-8")
                    return PlainTextResponse(content=content, media_type="text/plain")
                else:
                    # Default to plain text for other file types
                    content = requested_file.read_text(encoding="utf-8")
                    return PlainTextResponse(content=content, media_type="text/plain")

        @self.app.get("/api/samples/{sample_file}")
        async def get_sample_file(sample_file: str):
            """Serve a sample file by its filename, searching all tools."""

            if self._running_from_archive:
                for tool in self.tools_by_name.values():
                    archive_path = f"tools/{tool.name}/samples/{sample_file}"
                    try:
                        return _load_json_from_archive(archive_path)
                    except HTTPException as exc:
                        if exc.status_code != 404:
                            raise
                        # Try next tool
                        continue
                raise HTTPException(
                    status_code=404, detail=f"Sample file '{sample_file}' not found"
                )

            file_path = self.samples_by_name.get(sample_file)
            if file_path is None or not file_path.exists():
                raise HTTPException(
                    status_code=404, detail=f"Sample file '{sample_file}' not found"
                )

            try:
                content = file_path.read_text(encoding="utf-8")
                return JSONResponse(content=json.loads(content))
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=500, detail=f"Invalid JSON in sample file: {exc}")
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Error reading sample file: {exc}")

        @self.app.get("/health")
        async def health():
            """Health check endpoint."""
            return {
                "status": "healthy",
                "tools_loaded": len(self.tools),
                "protocols": ["rest", "mcp"],
                "transport": "http",
            }

        @self.app.post("/mcp")
        async def mcp_endpoint(request: MCPRequest):
            """MCP JSON-RPC 2.0 endpoint."""
            # Validate JSON-RPC version
            if request.jsonrpc != "2.0":
                return JSONResponse(
                    status_code=400,
                    content=MCPResponse(
                        id=request.id,
                        error=MCPError(code=-32600, message='Invalid Request: jsonrpc must be "2.0"'),
                    ).model_dump(exclude_none=True),
                )

            try:
                if request.method == "tools/list":
                    # Return tool index in MCP format
                    return JSONResponse(
                        content=MCPResponse(id=request.id, result=self.index_data).model_dump(
                            exclude_none=True
                        )
                    )

                elif request.method == "tools/call":
                    # Validate params
                    if not request.params or "name" not in request.params:
                        return JSONResponse(
                            status_code=400,
                            content=MCPResponse(
                                id=request.id,
                                error=MCPError(
                                    code=-32602, message='Invalid params: missing "name" field'
                                ),
                            ).model_dump(exclude_none=True),
                        )

                    tool_name = request.params["name"]
                    arguments = request.params.get("arguments", {})

                    # Lazy-load tool if in production mode
                    if self._running_from_archive and tool_name not in self.tools_by_name:
                        tool = self._lazy_load_tool(tool_name)
                        if tool is None:
                            return JSONResponse(
                                status_code=400,
                                content=MCPResponse(
                                    id=request.id,
                                    error=MCPError(
                                        code=-32601, message=f"Tool not found: {tool_name}"
                                    ),
                                ).model_dump(exclude_none=True),
                            )
                    elif tool_name not in self.tools_by_name:
                        return JSONResponse(
                            status_code=400,
                            content=MCPResponse(
                                id=request.id,
                                error=MCPError(code=-32601, message=f"Tool not found: {tool_name}"),
                            ).model_dump(exclude_none=True),
                        )
                    else:
                        tool = self.tools_by_name[tool_name]

                    if tool.pydantic_model is None:
                        return JSONResponse(
                            status_code=500,
                            content=MCPResponse(
                                id=request.id,
                                error=MCPError(
                                    code=-32603,
                                    message=f"Tool '{tool_name}' is missing its parameter model",
                                ),
                            ).model_dump(exclude_none=True),
                        )

                    try:
                        # Convert arguments dict to Pydantic parameter object
                        params_obj = tool.pydantic_model(**arguments)
                        result = tool.function(params_obj)

                        # Handle different result types
                        if hasattr(result, "model_dump"):
                            # It's a Pydantic model (like DebriefCommand)
                            command_result = result.model_dump()
                        elif isinstance(result, dict) and "command" in result:
                            # It's already a dict with command structure
                            command_result = result
                        else:
                            # Wrap non-command results as showText for backward compatibility
                            if isinstance(result, (str, int, float, bool)):
                                command_result = {"command": "showText", "payload": str(result)}
                            else:
                                command_result = {"command": "showData", "payload": result}

                        # Return JSON-RPC success response
                        return JSONResponse(
                            content=MCPResponse(
                                id=request.id, result=command_result
                            ).model_dump(exclude_none=True)
                        )

                    except TypeError as e:
                        # Handle argument validation errors
                        return JSONResponse(
                            status_code=400,
                            content=MCPResponse(
                                id=request.id,
                                error=MCPError(
                                    code=-32602,
                                    message=f"Invalid arguments for tool '{tool_name}': {str(e)}",
                                ),
                            ).model_dump(exclude_none=True),
                        )
                    except Exception as e:
                        # Handle tool execution errors
                        error_details = traceback.format_exc()
                        return JSONResponse(
                            status_code=500,
                            content=MCPResponse(
                                id=request.id,
                                error=MCPError(
                                    code=-32603,
                                    message=f"Tool execution failed: {str(e)}",
                                    data=error_details,
                                ),
                            ).model_dump(exclude_none=True),
                        )

                else:
                    # Unknown method
                    return JSONResponse(
                        status_code=400,
                        content=MCPResponse(
                            id=request.id,
                            error=MCPError(code=-32601, message=f"Method not found: {request.method}"),
                        ).model_dump(exclude_none=True),
                    )

            except Exception as e:
                # Catch-all error handler
                return JSONResponse(
                    status_code=500,
                    content=MCPResponse(
                        id=request.id,
                        error=MCPError(code=-32603, message=f"Internal error: {str(e)}"),
                    ).model_dump(exclude_none=True),
                )

        @self.app.post("/shutdown")
        async def shutdown():
            """Shutdown endpoint for graceful server termination."""
            import os
            import signal
            from threading import Timer

            def delayed_shutdown():
                """Shutdown the server after a brief delay."""
                try:
                    # Get the current process ID
                    pid = os.getpid()
                    # Send SIGTERM to self for graceful shutdown
                    os.kill(pid, signal.SIGTERM)
                except Exception as e:
                    print(f"Error during shutdown: {e}")
                    # Fallback to SIGKILL if SIGTERM fails
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except Exception:
                        pass

            # Schedule shutdown after 100ms to allow response to be sent
            timer = Timer(0.1, delayed_shutdown)
            timer.start()

            return {"status": "shutting_down", "message": "Server shutdown initiated"}


def create_app(tools_path: Optional[str] = None) -> "FastAPI":
    """
    Create and configure the ToolVault FastAPI application.

    Args:
        tools_path: Path to tools directory. If None, uses default path.

    Returns:
        Configured FastAPI application instance
    """
    if tools_path is None:
        current_dir = Path(__file__).parent

        # Check if we're running from a .pyz file
        if str(current_dir).endswith(".pyz"):
            # Running from .pyz - use internal tools directory
            tools_path = str(current_dir / "tools")
        else:
            # Running from command line - check for debug-package-contents first
            debug_tools = current_dir / "tmp_package_contents" / "tools"
            if debug_tools.exists():
                tools_path = str(debug_tools)
            else:
                # Fallback to regular tools directory
                tools_path = str(current_dir / "tools")

    server = ToolVaultServer(tools_path)
    return server.app
