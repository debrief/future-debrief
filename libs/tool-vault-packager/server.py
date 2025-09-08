"""FastAPI server for ToolVault runtime with MCP-compatible endpoints."""

import json
import traceback
from typing import Dict, Any, List, Optional
from pathlib import Path

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, ValidationError
except ImportError:
    # Handle case where dependencies might not be available yet
    FastAPI = None
    HTTPException = None
    JSONResponse = None
    BaseModel = None
    ValidationError = None

try:
    from .discovery import discover_tools, generate_index_json, ToolMetadata
except ImportError:
    # Handle case when running as script
    from discovery import discover_tools, generate_index_json, ToolMetadata


class ToolCallRequest(BaseModel):
    """Request model for tool call endpoint."""
    name: str
    arguments: Dict[str, Any]


class ToolCallResponse(BaseModel):
    """Response model for tool call endpoint."""
    result: Any
    isError: bool = False


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    details: Optional[str] = None


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
        
        # Discover tools
        try:
            self.tools = discover_tools(tools_path)
            self.index_data = generate_index_json(self.tools)
            self.tools_by_name = {tool.name: tool for tool in self.tools}
        except Exception as e:
            raise RuntimeError(f"Failed to initialize tools: {e}")
        
        # Setup routes
        self._setup_routes()
    
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
                # Call the tool function with provided arguments
                result = tool.function(**request.arguments)
                
                # Wrap result according to MCP spec
                return JSONResponse(content={
                    "result": result,
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
        
        @self.app.get("/tools/{tool_path:path}/tool.json")
        async def get_tool_metadata(tool_path: str):
            """Serve tool-specific metadata JSON file."""
            # Find tool by matching the tool_path with the tool directory path
            # The tool_path should match the relative path from tools/ directory
            matching_tool = None
            for tool in self.tools:
                # Convert tool.tool_dir to relative path from tools directory
                tool_dir_path = Path(tool.tool_dir)
                # If tool_dir is absolute, make it relative to tools directory
                if tool_dir_path.is_absolute():
                    # Find the tools part and get everything after it
                    parts = tool_dir_path.parts
                    if 'tools' in parts:
                        tools_index = parts.index('tools')
                        relative_path = '/'.join(parts[tools_index + 1:])
                    else:
                        relative_path = tool_dir_path.name
                else:
                    relative_path = str(tool_dir_path)
                
                if tool_path == relative_path:
                    matching_tool = tool
                    break
            
            if matching_tool is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Tool at path 'tools/{tool_path}' not found"
                )
            
            tool = matching_tool
            
            # Generate the tool-specific metadata structure
            tool_metadata = {
                "tool_name": tool.name,
                "description": tool.description,
                "files": {
                    "execute": {
                        "path": "execute.py",
                        "description": "Main tool implementation",
                        "type": "python"
                    },
                    "source_code": {
                        "path": "metadata/source_code.html",
                        "description": "Pretty-printed source code",
                        "type": "html"
                    },
                    "git_history": {
                        "path": "metadata/git_history.json",
                        "description": "Git commit history",
                        "type": "json"
                    },
                    "inputs": []
                },
                "stats": {
                    "sample_inputs_count": len(tool.sample_inputs),
                    "git_commits_count": len(tool.git_history),
                    "source_code_length": len(tool.source_code) if tool.source_code else 0
                }
            }
            
            # Add sample input files to metadata
            for sample_input in tool.sample_inputs:
                tool_metadata["files"]["inputs"].append({
                    "name": sample_input["name"],
                    "path": f"inputs/{sample_input['file']}",
                    "description": f"Sample input: {sample_input['name']}",
                    "type": "json"
                })
            
            return JSONResponse(content=tool_metadata)
        
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
        # Default to tools directory relative to this file
        current_dir = Path(__file__).parent
        tools_path = str(current_dir / "tools")
    
    server = ToolVaultServer(tools_path)
    return server.app