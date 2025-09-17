"""
Debrief WebSocket Bridge - Python Client API (Simplified Version)

This module provides a Python interface to communicate with the Debrief VS Code extension
through WebSocket messages. It allows Python scripts to interact with open Debrief plots.
"""

import json
import logging
import threading
import atexit
import sys
from typing import Optional, Dict, Any, List, Union

try:
    import websocket
except ImportError:
    raise ImportError(
        "websocket-client library is required. Install it with: pip install websocket-client"
    )

# Import State classes from the debrief-types package
try:
    from debrief.types import TimeState, ViewportState, SelectionState
except ImportError as e:
    raise ImportError(
        "debrief-types package is required. Install it with: pip install debrief-types\n"
        f"Original error: {e}"
    )


class DebriefAPIError(Exception):
    """Exception raised for errors in the Debrief API communication."""
    
    def __init__(self, message: str, code: Optional[Union[int, str]] = None):
        super().__init__(message)
        self.code = code



class DebriefWebSocketClient:
    """Singleton WebSocket client for communicating with Debrief VS Code extension."""
    
    _instance: Optional['DebriefWebSocketClient'] = None
    _lock = threading.Lock()
    
    def __new__(cls) -> 'DebriefWebSocketClient':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
            
        self._initialized = True
        self.url = "ws://localhost:60123"
        self.ws: Optional[websocket.WebSocket] = None
        self.connected = False
        self.logger = logging.getLogger(__name__)
        
        # Register cleanup
        atexit.register(self.cleanup)
    
    def connect(self) -> None:
        """
        Establish connection to the WebSocket server.
        
        Returns:
            None: Method returns nothing but raises DebriefAPIError on connection failure
        
        Raises:
            DebriefAPIError: When connection to WebSocket server fails
        """
        if self.connected and self.ws:
            return
            
        try:
            self.logger.info("Connecting to Debrief...")
            self.ws = websocket.create_connection(self.url, timeout=10)
            self.connected = True
            self.logger.info("Connected successfully!")
            
            # Read the welcome message
            try:
                welcome = self.ws.recv()
                self.logger.debug(f"Welcome message: {welcome}")
            except Exception:
                pass  # Welcome message is optional
                
        except Exception as e:
            self.connected = False
            self.ws = None
            raise DebriefAPIError(f"Connection failed: {str(e)}")
    
    def send_raw_message(self, message: str) -> str:
        """
        Send a raw string message and return the response.
        
        Args:
            message (str): The raw string message to send to the server
        
        Returns:
            str: The response from the server as a string
        
        Raises:
            DebriefAPIError: When connection fails or message sending fails
        """
        if not self.connected:
            self.connect()
            
        if not self.connected or not self.ws:
            raise DebriefAPIError("Not connected to Debrief")
        
        try:
            # Send message
            self.ws.send(message)
            
            # Receive response
            response = self.ws.recv()
            # Ensure we return a string
            if isinstance(response, str):
                return response
            elif isinstance(response, bytes):
                return response.decode('utf-8')
            else:
                return str(response)
            
        except Exception as e:
            self.logger.error(f"Error sending message: {e}")
            self.connected = False
            self.ws = None
            raise DebriefAPIError(f"Message send failed: {e}")
    
    def send_json_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a JSON message and return the parsed response.
        
        Args:
            message (Dict[str, Any]): The JSON message dictionary to send
        
        Returns:
            Dict[str, Any]: The parsed JSON response from the server
        
        Raises:
            DebriefAPIError: When connection fails, message sending fails, or server returns an error
        """
        if not self.connected:
            self.connect()
        
        # Check if this command uses filename parameter for optional filename handling
        params = message.get('params', {})
        if 'filename' in params:
            # filename in params means this command supports filename handling
            if params['filename'] is None:
                # filename=None means: use single editor or let user choose
                # Try the command without filename first
                response = self._send_json_raw(message)
                
                # Check for MULTIPLE_PLOTS error and handle it
                if ('error' in response and 
                    response['error'].get('code') == 'MULTIPLE_PLOTS'):
                    available_plots = response['error'].get('available_plots', [])
                    selected_filename = self._prompt_plot_selection(available_plots)
                    
                    # Retry with selected filename
                    message['params']['filename'] = selected_filename
                    return self._send_json_raw(message)
                    
                return response
            # else: filename has a value (use that specific file) - send directly
        
        # For commands without filename parameter, send directly
        return self._send_json_raw(message)
    
    def _send_json_raw(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a JSON message without filename handling logic.
        
        Args:
            message (Dict[str, Any]): The JSON message dictionary to send
        
        Returns:
            Dict[str, Any]: The parsed JSON response from the server
        
        Raises:
            DebriefAPIError: When message sending fails or JSON parsing fails
        """
        json_str = json.dumps(message)
        response_str = self.send_raw_message(json_str)
        
        try:
            response = json.loads(response_str)
            
            # Check for errors in response
            if 'error' in response:
                error_info = response['error']
                
                # Don't raise exception for MULTIPLE_PLOTS - let caller handle it
                if error_info.get('code') == 'MULTIPLE_PLOTS':
                    return response
                    
                raise DebriefAPIError(
                    error_info.get('message', 'Unknown error'),
                    error_info.get('code')
                )
                
            return response
        except json.JSONDecodeError as e:
            raise DebriefAPIError(f"Invalid JSON response: {e}")
    
    def _prompt_plot_selection(self, available_plots: List[Dict[str, str]]) -> str:
        """
        Prompt user to select from available plots.
        
        Args:
            available_plots (List[Dict[str, str]]): List of plot dictionaries with 'filename' and 'title' keys
        
        Returns:
            str: The filename of the selected plot
        
        Raises:
            DebriefAPIError: When no plots are available
            SystemExit: When user chooses to quit (via 'Q' input or Ctrl+C)
        """
        if not available_plots:
            raise DebriefAPIError("No plots available")
        
        if len(available_plots) == 1:
            return available_plots[0]['filename']
        
        print("\nMultiple plot files are open. Please select one:")
        for i, plot in enumerate(available_plots, 1):
            print(f"{i}. {plot['title']} ({plot['filename']})")
        print("\nOr enter 'Q' to quit.")
        
        while True:
            try:
                choice = input("\nEnter your choice (1-{} or Q): ".format(len(available_plots)))
                
                # Check for quit command
                if choice.lower() in ['q', 'quit', 'exit']:
                    print("Exiting script.")
                    sys.exit(0)
                
                choice_num = int(choice) - 1
                if 0 <= choice_num < len(available_plots):
                    selected = available_plots[choice_num]
                    print(f"Selected: {selected['title']}")
                    return selected['filename']
                else:
                    print(f"Please enter a number between 1 and {len(available_plots)}, or 'Q' to quit.")
            except KeyboardInterrupt:
                # Handle Ctrl+C - exit gracefully
                print("\nExiting script.")
                sys.exit(0)
            except ValueError:
                print("Invalid input. Please enter a number (1-{}) or 'Q' to quit.".format(len(available_plots)))
            except EOFError:
                # Handle cases where input stream is closed
                print("\nInput stream closed. Exiting script.")
                sys.exit(0)
    
    def cleanup(self) -> None:
        """
        Clean up resources.
        
        Returns:
            None: Method returns nothing, closes WebSocket connection and resets state
        """
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
            self.ws = None
        self.connected = False


class DebriefAPI:
    """
    Main API class providing discoverable methods for VS Code Debrief extension integration.
    
    This class wraps the WebSocket client to provide a clean, discoverable API interface
    that enables IDE auto-completion and better developer experience.
    
    Usage:
        from debrief_api import debrief
        
        # Connect and send notification
        debrief.connect()
        debrief.notify("Hello from Python!")
        
        # Work with plot features
        features = debrief.get_feature_collection("my_plot.plot.json")
        selected = debrief.get_selected_features("my_plot.plot.json")
    """
    
    def __init__(self):
        self._client = DebriefWebSocketClient()
    
    def connect(self) -> None:
        """
        Connect to the Debrief WebSocket server.
        
        Returns:
            None: Method returns nothing but establishes connection for subsequent API calls
        
        Raises:
            DebriefAPIError: When connection to WebSocket server fails
        """
        self._client.connect()
    
    def send_raw_message(self, message: str) -> str:
        """
        Send a raw message to the server.
        
        Args:
            message (str): The raw string message to send
        
        Returns:
            str: The response from the server as a string
        
        Raises:
            DebriefAPIError: When connection fails or message sending fails
        """
        return self._client.send_raw_message(message)
    
    def send_json_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a JSON message to the server.
        
        Args:
            message (Dict[str, Any]): The JSON message dictionary to send
        
        Returns:
            Dict[str, Any]: The parsed JSON response from the server
        
        Raises:
            DebriefAPIError: When connection fails, message sending fails, or server returns an error
        """
        return self._client.send_json_message(message)
    
    def notify(self, message: str) -> None:
        """
        Display a notification in VS Code.
        
        Args:
            message (str): The notification message text to display
        
        Returns:
            None: Method returns nothing but triggers a notification in VS Code
        
        Raises:
            DebriefAPIError: When WebSocket communication fails
        """
        command = {
            "command": "notify",
            "params": {
                "message": message
            }
        }
        self._client.send_json_message(command)
    
    def get_feature_collection(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the feature collection for a plot file.
        
        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            Dict[str, Any]: The GeoJSON FeatureCollection dictionary containing all features in the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "get_feature_collection",
            "params": {
                "filename": filename
            }
        }
        
        response = self._client.send_json_message(command)
        return response.get('result', {})
    
    def set_feature_collection(self, fc: Dict[str, Any], filename: Optional[str] = None) -> None:
        """
        Set the feature collection for a plot file.
        
        Args:
            fc (Dict[str, Any]): The GeoJSON FeatureCollection dictionary to set
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but updates the plot with the new feature collection
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "set_feature_collection",
            "params": {
                "data": fc,
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def get_selected_features(self, filename: Optional[str] = None) -> SelectionState:
        """
        Get the currently selected features for a plot file.
        
        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            SelectionState: SelectionState object containing selected feature IDs
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "get_selected_features",
            "params": {
                "filename": filename
            }
        }
        
        response = self._client.send_json_message(command)
        result = response.get('result', [])
        # Convert the list of features to feature IDs for SelectionState
        selected_ids = []
        if isinstance(result, list):
            for feature in result:
                if isinstance(feature, dict) and 'id' in feature:
                    selected_ids.append(feature['id'])
        return SelectionState(selectedIds=selected_ids)
    
    def set_selected_features(self, selection_state: SelectionState, filename: Optional[str] = None) -> None:
        """
        Set the selected features for a plot file.
        
        Args:
            selection_state (SelectionState): SelectionState object containing feature IDs to select
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but updates the selection state in the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "set_selected_features",
            "params": {
                "ids": selection_state.selectedIds,
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def update_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> None:
        """
        Update features in a plot file.
        
        Args:
            features (List[Dict[str, Any]]): List of GeoJSON Feature dictionaries to update (must have matching IDs)
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but updates the specified features in the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "update_features",
            "params": {
                "features": features,
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def add_features(self, features: List[Dict[str, Any]], filename: Optional[str] = None) -> None:
        """
        Add new features to a plot file.
        
        Args:
            features (List[Dict[str, Any]]): List of GeoJSON Feature dictionaries to add to the plot
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but adds the features to the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "add_features",
            "params": {
                "features": features,
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def delete_features(self, ids: List[str], filename: Optional[str] = None) -> None:
        """
        Delete features from a plot file.
        
        Args:
            ids (List[str]): List of feature IDs to delete
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but removes the specified features from the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "delete_features",
            "params": {
                "ids": ids,
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def zoom_to_selection(self, filename: Optional[str] = None) -> None:
        """
        Zoom to the selected features in a plot file.
        
        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but adjusts the viewport to fit selected features
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "zoom_to_selection",
            "params": {
                "filename": filename
            }
        }
        
        self._client.send_json_message(command)
    
    def list_open_plots(self) -> List[Dict[str, str]]:
        """
        Get a list of currently open plot files.
        
        Returns:
            List[Dict[str, str]]: List of dictionaries with 'filename' and 'title' keys for each open plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails
        """
        command = {
            "command": "list_open_plots"
        }
        response = self._client.send_json_message(command)
        return response.get('result', [])
    
    def get_time(self, filename: Optional[str] = None) -> Optional[TimeState]:
        """
        Get the current time state for a plot file.
        
        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            Optional[TimeState]: TimeState object with current time settings, or None if not available
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "get_time",
            "params": {
                "filename": filename
            }
        }
        response = self._client.send_json_message(command)
        result = response.get('result')
        if result is None:
            return None
        return TimeState.model_validate(result)
    
    def set_time(self, time_state: TimeState, filename: Optional[str] = None) -> None:
        """
        Set the time state for a plot file.
        
        Args:
            time_state (TimeState): TimeState object containing time settings to apply
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but updates the time state in the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "set_time",
            "params": {
                "timeState": time_state.model_dump(),
                "filename": filename
            }
        }
        self._client.send_json_message(command)
    
    def get_viewport(self, filename: Optional[str] = None) -> Optional[ViewportState]:
        """
        Get the current viewport state for a plot file.
        
        Args:
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            Optional[ViewportState]: ViewportState object with zoom and center coordinates, or None if not available
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "get_viewport",
            "params": {
                "filename": filename
            }
        }
        response = self._client.send_json_message(command)
        result = response.get('result')
        if result is None:
            return None
        return ViewportState.model_validate(result)
    
    def set_viewport(self, viewport_state: ViewportState, filename: Optional[str] = None) -> None:
        """
        Set the viewport state for a plot file.
        
        Args:
            viewport_state (ViewportState): ViewportState object containing zoom and center coordinates
            filename (Optional[str]): The plot file name. If None, uses single open plot or prompts for selection
        
        Returns:
            None: Method returns nothing but updates the viewport in the plot
        
        Raises:
            DebriefAPIError: When WebSocket communication fails or no plots are open
        """
        command = {
            "command": "set_viewport",
            "params": {
                "viewportState": viewport_state.model_dump(),
                "filename": filename
            }
        }
        self._client.send_json_message(command)


# Global API instance for easy access with auto-completion
debrief = DebriefAPI()