"""
Debrief MCP Client - Python Client API

This module provides a Python interface to communicate with the Debrief VS Code extension
through the Model Context Protocol (MCP) HTTP endpoint. It allows Python scripts to interact with open Debrief plots.
"""

import json
import logging
import sys
from typing import Optional, Dict, Any, List

try:
    import requests
except ImportError:
    raise ImportError(
        "requests library is required. Install it with: pip install requests"
    )

# Import State classes from the debrief-types package
try:
    from debrief.types.states import TimeState, ViewportState, SelectionState
except ImportError as e:
    raise ImportError(
        "debrief-types package is required. Install it with: pip install debrief-types\n"
        f"Original error: {e}"
    )


class DebriefAPIError(Exception):
    """Exception raised for errors in the Debrief API communication."""

    def __init__(self, message: str, code: Optional[int | str] = None):
        super().__init__(message)
        self.code = code


class DebriefMCPClient:
    """HTTP MCP client for communicating with Debrief VS Code extension."""

    _instance: Optional['DebriefMCPClient'] = None

    def __new__(cls) -> 'DebriefMCPClient':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return

        self._initialized = True
        self.base_url = "http://localhost:60123"
        self.mcp_url = f"{self.base_url}/mcp"
        self._request_id = 0
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.logger = logging.getLogger(__name__)

    def _call_mcp(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """
        Make an MCP JSON-RPC 2.0 request.

        Args:
            method (str): The JSON-RPC method to call (e.g., "tools/call")
            params (Optional[Dict[str, Any]]): Method parameters

        Returns:
            Any: The result from the JSON-RPC response

        Raises:
            DebriefAPIError: When the request fails or server returns an error
        """
        self._request_id += 1

        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {}
        }

        try:
            response = self.session.post(self.mcp_url, json=request, timeout=30)
            response.raise_for_status()

            result = response.json()

            if "error" in result:
                error_info = result["error"]
                raise DebriefAPIError(
                    error_info.get("message", "Unknown error"),
                    error_info.get("code")
                )

            return result.get("result")

        except requests.exceptions.ConnectionError as e:
            raise DebriefAPIError(f"Connection failed: {str(e)}")
        except requests.exceptions.Timeout as e:
            raise DebriefAPIError(f"Request timed out: {str(e)}")
        except requests.exceptions.HTTPError as e:
            raise DebriefAPIError(f"HTTP error: {str(e)}")
        except json.JSONDecodeError as e:
            raise DebriefAPIError(f"Invalid JSON response: {str(e)}")

    def call_tool(self, tool_name: str, arguments: Optional[Dict[str, Any]] = None) -> Any:
        """
        Call an MCP tool.

        Args:
            tool_name (str): Name of the tool to call
            arguments (Optional[Dict[str, Any]]): Tool arguments

        Returns:
            Any: Tool execution result

        Raises:
            DebriefAPIError: When tool execution fails
        """
        return self._call_mcp("tools/call", {
            "name": tool_name,
            "arguments": arguments or {}
        })


class DebriefAPI:
    """
    Main API class providing discoverable methods for VS Code Debrief extension integration.

    This class wraps the MCP HTTP client to provide a clean, discoverable API interface
    that enables IDE auto-completion and better developer experience.

    Usage:
        from debrief_api import debrief

        # Send notification
        debrief.notify("Hello from Python!")

        # Work with plot features
        features = debrief.get_feature_collection("my_plot.plot.json")
        selected = debrief.get_selected_features("my_plot.plot.json")
    """

    def __init__(self):
        self._client = DebriefMCPClient()

    def notify(self, message: str) -> None:
        """
        Display a notification in VS Code.

        Args:
            message (str): The notification message text to display

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        # Note: notify is not exposed as an MCP tool yet, but we can implement it if needed
        raise NotImplementedError("notify() is not available via MCP endpoint")

    def get_feature_collection(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the feature collection for a plot file.

        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot

        Returns:
            Dict[str, Any]: The GeoJSON FeatureCollection dictionary

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {}
        if filename is not None:
            arguments["filename"] = filename

        return self._client.call_tool("debrief_get_features", arguments)

    def set_feature_collection(self, fc: Dict[str, Any], filename: Optional[str] = None) -> None:
        """
        Set the feature collection for a plot file.

        Args:
            fc (Dict[str, Any]): The GeoJSON FeatureCollection dictionary
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"command": {"featureCollection": fc}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def get_selected_features(self, filename: Optional[str] = None) -> SelectionState:
        """
        Get the currently selected features for a plot file.

        Args:
            filename (Optional[str]): The plot file name

        Returns:
            SelectionState: SelectionState object containing selected feature IDs

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {}
        if filename is not None:
            arguments["filename"] = filename

        result = self._client.call_tool("debrief_get_selection", arguments)

        # The tool returns an array of feature objects, extract IDs
        selected_ids = []
        if isinstance(result, list):
            for feature in result:
                if isinstance(feature, dict) and 'id' in feature:
                    selected_ids.append(str(feature['id']))

        return SelectionState(selectedIds=selected_ids)

    def set_selected_features(self, selection_state: SelectionState, filename: Optional[str] = None) -> None:
        """
        Set the selected features for a plot file.

        Args:
            selection_state (SelectionState): SelectionState object
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        # Use apply_command to set selection
        arguments = {"command": {"selectionState": selection_state.model_dump(mode='json')}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def update_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> None:
        """
        Update features in a plot file.

        Args:
            features (List[Dict[str, Any]]): List of GeoJSON Feature dictionaries
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"command": {"features": features, "operation": "update"}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def add_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> None:
        """
        Add new features to a plot file.

        Args:
            features (List[Dict[str, Any]]): List of GeoJSON Feature dictionaries
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"command": {"features": features, "operation": "add"}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def delete_features(self, ids: List[str], filename: Optional[str] = None) -> None:
        """
        Delete features from a plot file.

        Args:
            ids (List[str]): List of feature IDs to delete
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"command": {"ids": ids, "operation": "delete"}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def zoom_to_selection(self, filename: Optional[str] = None) -> None:
        """
        Zoom to the selected features in a plot file.

        Args:
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"command": {"operation": "zoom_to_selection"}}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_apply_command", arguments)

    def list_open_plots(self) -> List[Dict[str, str]]:
        """
        Get a list of currently open plot files.

        Returns:
            List[Dict[str, str]]: List of dictionaries with 'filename' and 'title' keys

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        # This would require a new MCP tool - not implemented yet
        raise NotImplementedError("list_open_plots() is not available via MCP endpoint")

    def get_time(self, filename: Optional[str] = None) -> Optional[TimeState]:
        """
        Get the current time state for a plot file.

        Args:
            filename (Optional[str]): The plot file name

        Returns:
            Optional[TimeState]: TimeState object, or None if not available

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {}
        if filename is not None:
            arguments["filename"] = filename

        result = self._client.call_tool("debrief_get_time", arguments)
        if result is None:
            return None
        return TimeState.model_validate(result)

    def set_time(self, time_state: TimeState, filename: Optional[str] = None) -> None:
        """
        Set the time state for a plot file.

        Args:
            time_state (TimeState): TimeState object
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"timeState": time_state.model_dump(mode='json')}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_set_time", arguments)

    def get_viewport(self, filename: Optional[str] = None) -> Optional[ViewportState]:
        """
        Get the current viewport state for a plot file.

        Args:
            filename (Optional[str]): The plot file name

        Returns:
            Optional[ViewportState]: ViewportState object, or None if not available

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {}
        if filename is not None:
            arguments["filename"] = filename

        result = self._client.call_tool("debrief_get_viewport", arguments)
        if result is None:
            return None
        return ViewportState.model_validate(result)

    def set_viewport(self, viewport_state: ViewportState, filename: Optional[str] = None) -> None:
        """
        Set the viewport state for a plot file.

        Args:
            viewport_state (ViewportState): ViewportState object
            filename (Optional[str]): The plot file name

        Raises:
            DebriefAPIError: When MCP communication fails
        """
        arguments = {"viewportState": viewport_state.model_dump(mode='json')}
        if filename is not None:
            arguments["filename"] = filename

        self._client.call_tool("debrief_set_viewport", arguments)


# Global API instance for easy access with auto-completion
debrief = DebriefAPI()
