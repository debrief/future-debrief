"""
Simple MCP client for making JSON-RPC 2.0 requests to the Debrief MCP server.

This module provides a lightweight client for interacting with the Debrief VS Code
extension's MCP server using raw HTTP requests with JSON-RPC 2.0 protocol.

The server operates in stateless mode, meaning each request is independent and no
session initialization is required. This is the standard pattern for HTTP-based MCP
servers and is simpler, more reliable, and better suited for serverless deployments.

Example usage:
    from mcp_client import MCPClient

    # Create client (no initialization needed in stateless mode)
    client = MCPClient()

    # Read a resource
    features = client.read_resource("plot://myplot.plot.json/features")

    # Call a tool
    client.call_tool("debrief_notify", {"message": "Hello from Python!"})

    # List available tools
    tools = client.list_tools()

Context manager usage (optional):
    with MCPClient() as client:
        features = client.get_features()
"""

from __future__ import annotations

import requests
from typing import Any, Dict, List, Optional, Union, TYPE_CHECKING
import json

# Import Pydantic models for type checking (always available to type checkers)
if TYPE_CHECKING:
    from debrief.types.features.debrief_feature_collection import DebriefFeatureCollection
    from debrief.types.features.track import DebriefTrackFeature
    from debrief.types.features.point import DebriefPointFeature
    from debrief.types.features.annotation import DebriefAnnotationFeature
    from debrief.types.states.time_state import TimeState
    from debrief.types.states.viewport_state import ViewportState
    from debrief.types.states.selection_state import SelectionState

    # Type alias for any Debrief feature
    DebriefFeature = Union[DebriefTrackFeature, DebriefPointFeature, DebriefAnnotationFeature]

# Try to import Pydantic models at runtime for validation
try:
    from debrief.types.features.debrief_feature_collection import DebriefFeatureCollection as _DebriefFeatureCollection
    from debrief.types.features.track import DebriefTrackFeature as _DebriefTrackFeature
    from debrief.types.features.point import DebriefPointFeature as _DebriefPointFeature
    from debrief.types.features.annotation import DebriefAnnotationFeature as _DebriefAnnotationFeature
    from debrief.types.states.time_state import TimeState as _TimeState
    from debrief.types.states.viewport_state import ViewportState as _ViewportState
    from debrief.types.states.selection_state import SelectionState as _SelectionState
    PYDANTIC_AVAILABLE = True
except ImportError:
    # Pydantic models not available at runtime - validation will be skipped
    PYDANTIC_AVAILABLE = False
    _DebriefFeatureCollection = None  # type: ignore
    _DebriefTrackFeature = None  # type: ignore
    _DebriefPointFeature = None  # type: ignore
    _DebriefAnnotationFeature = None  # type: ignore
    _TimeState = None  # type: ignore
    _ViewportState = None  # type: ignore
    _SelectionState = None  # type: ignore


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

    Uses stateless HTTP transport where each request is independent.

    Attributes:
        base_url: The base URL of the MCP server
        timeout: Request timeout in seconds
        request_id: Auto-incrementing request ID counter
    """

    def __init__(self, port: int = 60123, host: str = "localhost", timeout: int = 10):
        """
        Initialize MCP client for stateless HTTP transport.

        In stateless mode, each request is completely independent with no session
        management required. No headers or initialization needed.

        Args:
            port: Server port (default: 60123)
            host: Server host (default: localhost)
            timeout: Request timeout in seconds (default: 10)
        """
        self.base_url = f"http://{host}:{port}/mcp"
        self.timeout = timeout
        self.request_id = 0

    def _parse_sse_response(self, sse_text: str) -> Dict[str, Any]:
        """
        Parse Server-Sent Events format to extract JSON data.

        SSE format:
            event: message
            id: <some-id>
            data: {"jsonrpc": "2.0", ...}

        Args:
            sse_text: Raw SSE response text

        Returns:
            Parsed JSON data from the 'data:' field
        """
        lines = sse_text.strip().split('\n')
        for line in lines:
            if line.startswith('data: '):
                json_str = line[6:]  # Remove 'data: ' prefix
                return json.loads(json_str)

        raise Exception(f"No data field found in SSE response: {sse_text[:200]}")

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
                    "Accept": "application/json, text/event-stream"  # Required for HTTP streaming transport
                }
            )

            # Parse response based on Content-Type
            content_type = response.headers.get('Content-Type', '')

            if 'text/event-stream' in content_type:
                # Server-Sent Events format - extract JSON from data field
                data = self._parse_sse_response(response.text)
            else:
                # Plain JSON response
                try:
                    data = response.json()
                except Exception as json_error:
                    # If JSON parsing fails, show what we got
                    response.raise_for_status()
                    body_preview = response.text[:500] if response.text else '(empty)'
                    raise Exception(
                        f"Invalid JSON response from server\n"
                        f"Content-Type: {content_type}\n"
                        f"Status: {response.status_code}\n"
                        f"Body preview: {body_preview}\n"
                        f"JSON Error: {json_error}"
                    )

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

    def get_features(self, filename: Optional[str] = None, validate: bool = True) -> DebriefFeatureCollection:
        """
        Get feature collection from a plot.

        Args:
            filename: Optional plot filename
            validate: If True, validate response with Pydantic (default: True)

        Returns:
            DebriefFeatureCollection: Validated feature collection model
        """
        uri = f"plot://{filename}/features" if filename else "plot://features"
        result = self.read_resource(uri)

        # Validate with Pydantic if available and requested
        if validate and PYDANTIC_AVAILABLE and _DebriefFeatureCollection:
            try:
                return _DebriefFeatureCollection.model_validate(result)
            except Exception as e:
                print(f"⚠️  Pydantic validation failed: {e}")
                print("    Returning unvalidated data as model")
                # Still wrap in model even if validation fails, for consistency
                return _DebriefFeatureCollection.model_validate(result, strict=False)

        # If Pydantic not available, wrap result in model anyway
        if PYDANTIC_AVAILABLE and _DebriefFeatureCollection:
            return _DebriefFeatureCollection.model_validate(result, strict=False)

        # Fallback: return raw dict if Pydantic not available at all
        return result  # type: ignore

    def add_features(self, features: List[DebriefFeature], filename: Optional[str] = None, validate: bool = True) -> Any:
        """
        Add features to a plot.

        Args:
            features: List of Debrief features (DebriefTrackFeature, DebriefPointFeature, or DebriefAnnotationFeature)
            filename: Optional plot filename
            validate: If True, validate features with Pydantic before sending (default: True)

        Returns:
            Tool result
        """
        # Convert Pydantic models to dicts for JSON serialization
        feature_dicts = []
        for feature in features:
            if PYDANTIC_AVAILABLE and hasattr(feature, 'model_dump'):
                # It's a Pydantic model, serialize it
                feature_dicts.append(feature.model_dump())
            else:
                # It's already a dict
                feature_dicts.append(feature)  # type: ignore

        args: Dict[str, Any] = {"features": feature_dicts}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_add_features", args)

    def update_features(self, features: List[DebriefFeature], filename: Optional[str] = None, validate: bool = True) -> Any:
        """
        Update features in a plot by ID.

        Args:
            features: List of Debrief features with IDs to update
            filename: Optional plot filename
            validate: If True, validate features with Pydantic before sending (default: True)

        Returns:
            Tool result
        """
        # Convert Pydantic models to dicts for JSON serialization
        feature_dicts = []
        for feature in features:
            if PYDANTIC_AVAILABLE and hasattr(feature, 'model_dump'):
                # It's a Pydantic model, serialize it
                feature_dicts.append(feature.model_dump())
            else:
                # It's already a dict
                feature_dicts.append(feature)  # type: ignore

        args: Dict[str, Any] = {"features": feature_dicts}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_update_features", args)

    def delete_features(self, ids: List[str], filename: Optional[str] = None) -> Any:
        """Delete features from a plot by ID."""
        args: Dict[str, Any] = {"ids": ids}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_delete_features", args)

    def set_features(self, feature_collection: DebriefFeatureCollection, filename: Optional[str] = None) -> Any:
        """Replace entire feature collection."""
        # Convert Pydantic model to dict if needed
        if PYDANTIC_AVAILABLE and hasattr(feature_collection, 'model_dump'):
            feature_collection_dict = feature_collection.model_dump()
        else:
            feature_collection_dict = feature_collection  # type: ignore

        args: Dict[str, Any] = {"featureCollection": feature_collection_dict}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_features", args)

    def get_selection(self, filename: Optional[str] = None, validate: bool = True) -> SelectionState:
        """
        Get selected feature IDs.

        Args:
            filename: Optional plot filename
            validate: If True, validate response with Pydantic (default: True)

        Returns:
            SelectionState: Validated selection state model
        """
        if filename:
            result = self.read_resource(f"plot://{filename}/selection")
        else:
            result = self.read_resource("plot://selection")

        # Validate with Pydantic if available and requested
        if PYDANTIC_AVAILABLE and _SelectionState:
            return _SelectionState.model_validate(result)

        return result  # type: ignore

    def set_selection(self, selected_ids: List[str], filename: Optional[str] = None) -> Any:
        """Set selected feature IDs."""
        args: Dict[str, Any] = {"selectedIds": selected_ids}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_selection", args)

    def zoom_to_selection(self, filename: Optional[str] = None) -> Any:
        """Zoom to selected features."""
        args: Dict[str, Any] = {}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_zoom_to_selection", args)

    def get_time(self, filename: Optional[str] = None, validate: bool = True) -> TimeState:
        """
        Get time state.

        Args:
            filename: Optional plot filename
            validate: If True, validate response with Pydantic (default: True)

        Returns:
            TimeState: Validated time state model
        """
        if filename:
            result = self.read_resource(f"plot://{filename}/time")
        else:
            result = self.read_resource("plot://time")

        # Validate with Pydantic if available
        if PYDANTIC_AVAILABLE and _TimeState:
            return _TimeState.model_validate(result)

        return result  # type: ignore

    def set_time(self, time_state: TimeState, filename: Optional[str] = None) -> Any:
        """Set time state."""
        # Convert Pydantic model to dict if needed
        if PYDANTIC_AVAILABLE and hasattr(time_state, 'model_dump'):
            time_state_dict = time_state.model_dump()
        else:
            time_state_dict = time_state  # type: ignore

        args: Dict[str, Any] = {"timeState": time_state_dict}
        if filename:
            args["filename"] = filename
        return self.call_tool("debrief_set_time", args)

    def get_viewport(self, filename: Optional[str] = None, validate: bool = True) -> ViewportState:
        """
        Get viewport state.

        Args:
            filename: Optional plot filename
            validate: If True, validate response with Pydantic (default: True)

        Returns:
            ViewportState: Validated viewport state model
        """
        if filename:
            result = self.read_resource(f"plot://{filename}/viewport")
        else:
            result = self.read_resource("plot://viewport")

        # Validate with Pydantic if available
        if PYDANTIC_AVAILABLE and _ViewportState:
            return _ViewportState.model_validate(result)

        return result  # type: ignore

    def set_viewport(self, viewport_state: ViewportState, filename: Optional[str] = None) -> Any:
        """Set viewport state."""
        # Convert Pydantic model to dict if needed
        if PYDANTIC_AVAILABLE and hasattr(viewport_state, 'model_dump'):
            viewport_state_dict = viewport_state.model_dump()
        else:
            viewport_state_dict = viewport_state  # type: ignore

        args: Dict[str, Any] = {"viewportState": viewport_state_dict}
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
