"""FastAPI server for ToolVault runtime with MCP-compatible endpoints."""

import json
import traceback
from typing import Dict, Any, List, Optional
from pathlib import Path

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse, HTMLResponse, PlainTextResponse
    from fastapi.staticfiles import StaticFiles
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, ValidationError
except ImportError:
    # Handle case where dependencies might not be available yet
    FastAPI = None
    HTTPException = None
    JSONResponse = None
    StaticFiles = None
    CORSMiddleware = None
    BaseModel = None
    ValidationError = None

# Handle imports - try absolute first, then relative
try:
    from discovery import discover_tools, generate_index_json, ToolMetadata
except ImportError:
    try:
        from .discovery import discover_tools, generate_index_json, ToolMetadata
    except ImportError:
        # Last resort: explicit module loading
        import sys
        import importlib.util
        import os

        current_dir = os.path.dirname(os.path.abspath(__file__))
        discovery_path = os.path.join(current_dir, "discovery.py")

        if os.path.exists(discovery_path):
            spec = importlib.util.spec_from_file_location("discovery", discovery_path)
            discovery_module = importlib.util.module_from_spec(spec)
            sys.modules["discovery"] = discovery_module
            spec.loader.exec_module(discovery_module)

            from discovery import discover_tools, generate_index_json, ToolMetadata
        else:
            raise ImportError("Could not locate discovery module")

# Try to import shared-types classes if available
try:
    from debrief.types.tools.ToolCallRequest import ToolCallRequest as SharedToolCallRequest
    from debrief.types.tools.ToolCallResponse import ToolCallResponse as SharedToolCallResponse
    SHARED_TYPES_AVAILABLE = True
except ImportError:
    SHARED_TYPES_AVAILABLE = False


# Only define models if BaseModel is available
if BaseModel is not None:
    class ToolArgument(BaseModel):
        """Individual tool argument with name and value."""
        name: str
        value: Any

    class ToolCallRequest(BaseModel):
        """Request model for tool call endpoint matching new schema format."""
        name: str
        arguments: List[ToolArgument]

    class ToolVaultCommand(BaseModel):
        """ToolVault command object for tool responses."""
        command: str
        payload: Any

    class ToolCallResponse(BaseModel):
        """Response model for tool call endpoint matching new schema format."""
        result: ToolVaultCommand
        isError: bool = False

    class ErrorResponse(BaseModel):
        """Error response model."""
        error: str
        details: Optional[str] = None
else:
    # Fallback simple classes when Pydantic is not available
    class ToolArgument:
        def __init__(self, name: str, value: Any):
            self.name = name
            self.value = value

    class ToolCallRequest:
        def __init__(self, name: str, arguments: List[Dict[str, Any]]):
            self.name = name
            self.arguments = [ToolArgument(**arg) for arg in arguments]

    class ToolVaultCommand:
        def __init__(self, command: str, payload: Any):
            self.command = command
            self.payload = payload

    class ToolCallResponse:
        def __init__(self, result: Dict[str, Any], isError: bool = False):
            self.result = ToolVaultCommand(**result)
            self.isError = isError

    class ErrorResponse:
        def __init__(self, error: str, details: Optional[str] = None):
            self.error = error
            self.details = details


class ToolVaultServer:
    """ToolVault FastAPI server implementation."""
    
    def __init__(self, tools_path: str):
        """Initialize the server with tools from the specified path."""
        if FastAPI is None:
            raise ImportError("FastAPI dependencies not available. Install with: pip install fastapi uvicorn")
        
        self.app = FastAPI(
            title="ToolVault Server",
            description="MCP-compatible tool execution server",
            version="1.0.0"
        )
        
        # Add CORS middleware to allow cross-origin requests from SPA
        if CORSMiddleware:
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
                allow_credentials=True,
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allow_headers=["*"],
            )
        
        # Discover tools
        try:
            self.tools = discover_tools(tools_path)
            self.index_data = generate_index_json(self.tools)
            self.tools_by_name = {tool.name: tool for tool in self.tools}
        except Exception as e:
            raise RuntimeError(f"Failed to initialize tools: {e}")
        
        # Setup static files for SPA
        self._setup_static_files()
        
        # Setup routes
        self._setup_routes()
    
    
    def _setup_static_files(self):
        """Setup static file serving for SPA."""
        import sys
        
        # Check if running from a .pyz file
        if str(sys.argv[0]).endswith('.pyz'):
            # Running from packaged archive - need to handle static files differently
            print("Detected packaged mode - setting up archive static file serving")
            self._setup_archive_static_files()
        else:
            # Running from extracted files - use normal static file serving
            if StaticFiles is None:
                return
            
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
        import zipfile
        import sys
        from io import BytesIO
        
        try:
            # Get the .pyz file path
            pyz_path = sys.argv[0]
            
            # Read files from archive
            with zipfile.ZipFile(pyz_path, 'r') as zf:
                static_files = {}
                
                # Find all static files in the archive
                for file_info in zf.infolist():
                    if file_info.filename.startswith('static/'):
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
                if file_path.endswith('.js'):
                    content_type = "application/javascript"
                elif file_path.endswith('.css'):
                    content_type = "text/css"
                elif file_path.endswith('.svg'):
                    content_type = "image/svg+xml"
                elif file_path.endswith('.png'):
                    content_type = "image/png"
                elif file_path.endswith('.ico'):
                    content_type = "image/x-icon"
                
                return Response(content=content, media_type=content_type)
            else:
                # For SPA routing, serve index.html for unknown paths
                if "static/index.html" in static_files:
                    return Response(content=static_files["static/index.html"], media_type="text/html")
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
                    "health": "/health"
                }
            }
        
        @self.app.get("/tools/list")
        async def list_tools():
            """MCP-compatible tools list endpoint."""
            try:
                return JSONResponse(content=self.index_data)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to list tools: {str(e)}"
                )
        
        @self.app.post("/tools/call")
        async def call_tool(request: ToolCallRequest):
            """MCP-compatible tool call endpoint."""
            tool_name = request.name

            if tool_name not in self.tools_by_name:
                raise HTTPException(
                    status_code=404,
                    detail=f"Tool '{tool_name}' not found"
                )

            tool = self.tools_by_name[tool_name]

            try:
                # Convert new argument format to keyword arguments
                kwargs = {}
                for arg in request.arguments:
                    kwargs[arg.name] = arg.value

                # Call the tool function with provided arguments
                result = tool.function(**kwargs)

                # Ensure result is a ToolVault command object
                if not isinstance(result, dict) or "command" not in result:
                    # Wrap non-command results as showText for backward compatibility
                    if isinstance(result, (str, int, float, bool)):
                        command_result = {
                            "command": "showText",
                            "payload": str(result)
                        }
                    else:
                        command_result = {
                            "command": "showData",
                            "payload": result
                        }
                else:
                    command_result = result

                # Return according to new schema format
                return JSONResponse(content={
                    "result": command_result,
                    "isError": False
                })

            except TypeError as e:
                # Handle argument validation errors
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid arguments for tool '{tool_name}': {str(e)}"
                )
            except Exception as e:
                # Handle tool execution errors
                error_details = traceback.format_exc()
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": f"Tool execution failed: {str(e)}",
                        "details": error_details,
                        "isError": True
                    }
                )
        
        @self.app.get("/api/tools/{full_path:path}")
        async def get_tool_file(full_path: str):
            """Serve any file from the tools directory structure."""
            import sys
            
            # Check if running from a .pyz file
            if hasattr(sys, '_MEIPASS') or str(sys.argv[0]).endswith('.pyz'):
                # Running from packaged archive - read from zip
                import zipfile
                try:
                    pyz_path = sys.argv[0]
                    with zipfile.ZipFile(pyz_path, 'r') as zf:
                        tools_file_path = f"tools/{full_path}"
                        if tools_file_path in zf.namelist():
                            content = zf.read(tools_file_path).decode('utf-8')
                            
                            # Determine content type and serve file
                            if full_path.endswith('.html'):
                                return HTMLResponse(content=content)
                            elif full_path.endswith('.json'):
                                return JSONResponse(content=json.loads(content))
                            elif full_path.endswith('.py'):
                                return PlainTextResponse(content=content, media_type="text/plain")
                            else:
                                # Default to plain text for other file types
                                return PlainTextResponse(content=content, media_type="text/plain")
                        else:
                            raise HTTPException(status_code=404, detail=f"File '{full_path}' not found in archive")
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Error reading from archive: {e}")
            else:
                # Running from file system
                # Get the base tools directory from discovery
                if self.tools:
                    # Use the parent directory of any tool to find the tools root
                    sample_tool_dir = Path(self.tools[0].tool_dir)
                    if 'tools' in sample_tool_dir.parts:
                        tools_index = sample_tool_dir.parts.index('tools')
                        tools_root = Path(*sample_tool_dir.parts[:tools_index + 1])
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
                    raise HTTPException(status_code=403, detail="Access denied - path outside tools directory")
                
                # Check if file exists
                if not requested_file.exists():
                    raise HTTPException(status_code=404, detail=f"File '{full_path}' not found")
                
                # Determine content type and serve file
                if full_path.endswith('.html'):
                    content = requested_file.read_text(encoding='utf-8')
                    return HTMLResponse(content=content)
                elif full_path.endswith('.json'):
                    content = requested_file.read_text(encoding='utf-8')
                    return JSONResponse(content=json.loads(content))
                elif full_path.endswith('.py'):
                    content = requested_file.read_text(encoding='utf-8')
                    return PlainTextResponse(content=content, media_type="text/plain")
                else:
                    # Default to plain text for other file types
                    content = requested_file.read_text(encoding='utf-8')
                    return PlainTextResponse(content=content, media_type="text/plain")
        
        @self.app.get("/health")
        async def health():
            """Health check endpoint."""
            return {"status": "healthy", "tools_loaded": len(self.tools)}


def create_app(tools_path: str = None) -> FastAPI:
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
        if str(current_dir).endswith('.pyz'):
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