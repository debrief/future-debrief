"""
Simple MCP client for making JSON-RPC 2.0 requests to the Debrief MCP server.

This module provides a lightweight client for interacting with the Debrief VS Code
extension's MCP server using raw HTTP requests with JSON-RPC 2.0 protocol.

Each MCPClient instance maintains its own session with the server using a unique
session ID. The session persists for the lifetime of the client instance.

Example usage:
    from mcp_client import MCPClient

    # Create client (establishes session automatically)
    client = MCPClient()

    # Read a resource
    features = client.read_resource("plot://myplot.plot.json/features")

    # Call a tool
    client.call_tool("debrief_notify", {"message": "Hello from Python!"})

    # List available tools
    tools = client.list_tools()

    # Close session when done (optional - sessions expire automatically)
    client.close()

Context manager usage:
    with MCPClient() as client:
        features = client.get_features()
        # Session automatically closed when exiting context
"""

import requests
from typing import Any, Dict, List, Optional
import json
import uuid


class MCPError(Exception):
    """Exception raised for MCP protocol errors."""

    def __init__(self, code: int, message: str, data: Any = None):
        self.code = code
        self.message = message
        self.data = data
        super().__init__(f"MCP Error {code}: {message}")


class MCPClient:
    """
    Simple client for interacting with MCP servers using JSON-RPC 2.0 over HTTP.

    Attributes:
        base_url: The base URL of the MCP server
        timeout: Request timeout in seconds
        request_id: Auto-incrementing request ID counter
        session_id: Unique session identifier for this client
    """

    def __init__(self, port: int = 60123, host: str = "localhost", timeout: int = 10):
        """
        Initialize MCP client with session management.

        Args:
            port: Server port (default: 60123)
            host: Server host (default: localhost)
            timeout: Request timeout in seconds (default: 10)
        """
        self.base_url = f"http://{host}:{port}/mcp"
        self.timeout = timeout
        self.request_id = 0
        # Generate unique session ID for this client instance
        self.session_id = str(uuid.uuid4())
        # Track if session is initialized
        self._initialized = False
        # Initialize the session with the server
        self._initialize_session()

    def _initialize_session(self):
        """
        Initialize the MCP session by calling the 'initialize' method.
        This must be done before any other MCP requests.
        """
        try:
            result = self._make_request("initialize", {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "roots": {
                        "listChanged": False
                    }
                },
                "clientInfo": {
                    "name": "Debrief Python Client",
                    "version": "1.0.0"
                }
            })
            self._initialized = True
        except Exception as e:
            raise Exception(f"Failed to initialize MCP session: {e}")

    def _make_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """
        Make a JSON-RPC 2.0 request to the MCP server.

        Args:
            method: The JSON-RPC method name
            params: Optional parameters dict

        Returns:
            The result field from the JSON-RPC response

        Raises:
            MCPError: If the server returns an error
            requests.RequestException: If the HTTP request fails
        """
        self.request_id += 1

        payload = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method
        }

        if params is not None:
            payload["params"] = params

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                timeout=self.timeout,
                headers={
                    "Content-Type": "application/json",
                    "Mcp-Session-Id": self.session_id  # Session management header
                }
            )

            # Try to parse JSON even on error responses
            try:
                data = response.json()
            except:
                # If JSON parsing fails, raise the HTTP error with status
                response.raise_for_status()
                raise Exception(f"Invalid JSON response from server")

            # Check for JSON-RPC error (even if HTTP status is not 200)
            if "error" in data:
                error = data["error"]
                raise MCPError(
                    code=error.get("code", -1),
                    message=error.get("message", "Unknown error"),
                    data=error.get("data")
                )

            # If no error in JSON but HTTP status is not OK, raise it
            response.raise_for_status()

            return data.get("result")

        except MCPError:
            # Re-raise MCP errors as-is
            raise
        except requests.RequestException as e:
            raise Exception(f"HTTP request failed: {e}")

    def close(self):
        """
        Close the session (optional - sessions expire automatically).

        This is mainly for explicit cleanup in context manager usage.
        The server will automatically clean up expired sessions.
        """
        # Note: FastMCP handles session cleanup automatically
        # This method exists for explicit cleanup and context manager support
        pass

    def __enter__(self):
        """Context manager entry - returns self for 'with' statement."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - closes session."""
        self.close()
        return False  # Don't suppress exceptions

    def test_connection(self) -> bool:
        """
        Test if the MCP server is accessible.

        Returns:
            True if server is accessible, False otherwise
        """
        try:
            response = requests.get(
                f"http://localhost:{self.base_url.split(':')[2].split('/')[0]}/health",
                timeout=2
            )
            return response.status_code == 200
        except:
            return False

    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List all available tools on the MCP server.

        Returns:
            List of tool definitions
        """
        result = self._make_request("tools/list")
        return result.get("tools", []) if result else []

    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """
        Call a tool on the MCP server.

        Args:
            name: Tool name (e.g., "debrief_add_features")
            arguments: Tool arguments as a dict

        Returns:
            Tool result
        """
        return self._make_request("tools/call", {
            "name": name,
            "arguments": arguments
        })

    def list_resources(self) -> List[Dict[str, Any]]:
        """
        List all available resources on the MCP server.

        Returns:
            List of resource definitions
        """
        result = self._make_request("resources/list")
        return result.get("resources", []) if result else []

    def read_resource(self, uri: str) -> Any:
        """
        Read a resource from the MCP server.

        Args:
            uri: Resource URI (e.g., "plot://myplot.plot.json/features")

        Returns:
            Resource contents (parsed JSON if text/json)
        """
        result = self._make_request("resources/read", {"uri": uri})

        if result and "contents" in result:
            contents = result["contents"]
            if contents and len(contents) > 0:
                content = contents[0]
                if "text" in content:
                    # Try to parse as JSON
                    try:
                        return json.loads(content["text"])
                    except json.JSONDecodeError:
                        return content["text"]
                elif "blob" in content:
                    return content["blob"]

        return result

    # Convenience methods for Debrief-specific operations

    def notify(self, message: str, level: str = "info") -> Any:
        """Display a VS Code notification."""
        return self.call_tool("debrief_notify", {
            "message": message,
            "level": level
        })

    def get_features(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """Get feature collection from a plot."""
        if filename:
            return self.read_resource(f"plot://{filename}/features")
        else:
            # Try without filename - server will auto-select if only one plot open
            return self.read_resource("plot://features")

    def add_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> Any:
        """Add features to a plot."""
        args = {"features": features}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_add_features", args)

    def update_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> Any:
        """Update features in a plot by ID."""
        args = {"features": features}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_update_features", args)

    def delete_features(self, ids: List[str], filename: Optional[str] = None) -> Any:
        """Delete features from a plot by ID."""
        args = {"ids": ids}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_delete_features", args)

    def set_features(self, feature_collection: Dict[str, Any], filename: Optional[str] = None) -> Any:
        """Replace entire feature collection."""
        args = {"featureCollection": feature_collection}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_features", args)

    def get_selection(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """Get selected feature IDs."""
        if filename:
            return self.read_resource(f"plot://{filename}/selection")
        else:
            return self.read_resource("plot://selection")

    def set_selection(self, selected_ids: List[str], filename: Optional[str] = None) -> Any:
        """Set selected feature IDs."""
        args = {"selectedIds": selected_ids}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_selection", args)

    def zoom_to_selection(self, filename: Optional[str] = None) -> Any:
        """Zoom to selected features."""
        args = {}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_zoom_to_selection", args)

    def get_time(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """Get time state."""
        if filename:
            return self.read_resource(f"plot://{filename}/time")
        else:
            return self.read_resource("plot://time")

    def set_time(self, time_state: Dict[str, str], filename: Optional[str] = None) -> Any:
        """Set time state."""
        args = {"timeState": time_state}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_time", args)

    def get_viewport(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """Get viewport state."""
        if filename:
            return self.read_resource(f"plot://{filename}/viewport")
        else:
            return self.read_resource("plot://viewport")

    def set_viewport(self, viewport_state: Dict[str, Any], filename: Optional[str] = None) -> Any:
        """Set viewport state."""
        args = {"viewportState": viewport_state}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_viewport", args)

    def list_plots(self) -> List[Dict[str, str]]:
        """List all open plot files."""
        return self.read_resource("plots://list")


if __name__ == "__main__":
    # Simple test when run directly
    client = MCPClient()

    print("Testing MCP connection...")
    if client.test_connection():
        print("✓ Server is accessible")

        print("\nListing available tools...")
        tools = client.list_tools()
        print(f"✓ Found {len(tools)} tools")

        print("\nSending test notification...")
        client.notify("Hello from Python MCP client!")
        print("✓ Notification sent")

    else:
        print("✗ Server is not accessible. Is the VS Code extension running?")
