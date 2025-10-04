"""
Debrief HTTP Bridge - Python Client API (Simplified Version)

This module provides a Python interface to communicate with the Debrief VS Code extension
through HTTP messages. It allows Python scripts to interact with open Debrief plots.
"""

import json
import logging
import sys
from typing import Optional, Dict, Any, List, Union

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
    
    def __init__(self, message: str, code: Optional[Union[int, str]] = None):
        super().__init__(message)
        self.code = code



class DebriefHTTPClient:
    """HTTP client for communicating with Debrief VS Code extension."""

    def __init__(self):
        self.url = "http://localhost:60123"
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        # Set timeout for all requests
        self.session.timeout = 10

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures session is closed."""
        self.cleanup()
        return False

    def cleanup(self) -> None:
        """
        Clean up HTTP session resources.

        Should be called when done using the client, or use the client
        as a context manager to ensure automatic cleanup.
        """
        if self.session:
            self.session.close()

    def connect(self) -> None:
        """
        Test connection to the HTTP server.

        Returns:
            None: Method returns nothing but raises DebriefAPIError on connection failure

        Raises:
            DebriefAPIError: When connection to HTTP server fails
        """
        try:
            self.logger.info("Testing connection to Debrief...")
            # Send a simple notify command to test connection
            test_message = {
                "command": "list_open_plots",
                "params": {}
            }
            response = self.session.post(self.url, json=test_message, timeout=10)
            if response.status_code == 200:
                self.logger.info("Connected successfully!")
            else:
                raise DebriefAPIError(f"Server returned status {response.status_code}")
        except requests.exceptions.ConnectionError as e:
            raise DebriefAPIError(f"Connection failed: Cannot connect to Debrief HTTP server at {self.url}. Make sure VS Code extension is running.")
        except requests.exceptions.Timeout as e:
            raise DebriefAPIError(f"Connection timeout: Server did not respond within 10 seconds")
        except Exception as e:
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
        try:
            # Parse the message as JSON to send properly
            json_message = json.loads(message)
            response = self.session.post(self.url, json=json_message, timeout=10)

            # Return the response text
            return response.text

        except json.JSONDecodeError:
            # If not JSON, send as raw text (though server expects JSON)
            raise DebriefAPIError("Server expects JSON messages")
        except requests.exceptions.ConnectionError:
            raise DebriefAPIError(f"Not connected to Debrief. Make sure VS Code extension is running.")
        except requests.exceptions.Timeout:
            raise DebriefAPIError("Request timeout: Server did not respond within 10 seconds")
        except Exception as e:
            self.logger.error(f"Error sending message: {e}")
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
        try:
            response = self.session.post(self.url, json=message, timeout=10)

            # Check HTTP status code
            if response.status_code >= 500:
                raise DebriefAPIError(f"Server error: HTTP {response.status_code}")

            # Parse JSON response
            try:
                response_data = response.json()
            except json.JSONDecodeError as e:
                raise DebriefAPIError(f"Invalid JSON response: {e}")

            # Check for errors in response
            if 'error' in response_data:
                error_info = response_data['error']

                # Don't raise exception for MULTIPLE_PLOTS - let caller handle it
                if error_info.get('code') == 'MULTIPLE_PLOTS':
                    return response_data

                raise DebriefAPIError(
                    error_info.get('message', 'Unknown error'),
                    error_info.get('code')
                )

            return response_data

        except requests.exceptions.ConnectionError:
            raise DebriefAPIError(f"Not connected to Debrief. Make sure VS Code extension is running.")
        except requests.exceptions.Timeout:
            raise DebriefAPIError("Request timeout: Server did not respond within 10 seconds")
        except DebriefAPIError:
            raise  # Re-raise our own errors
        except Exception as e:
            raise DebriefAPIError(f"Request failed: {e}")
    
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
    
class DebriefAPI:
    """
    Main API class providing discoverable methods for VS Code Debrief extension integration.

    This class wraps the HTTP client to provide a clean, discoverable API interface
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
        self._client = DebriefHTTPClient()
    
    def connect(self) -> None:
        """
        Connect to the Debrief HTTP server.

        Returns:
            None: Method returns nothing but establishes connection for subsequent API calls

        Raises:
            DebriefAPIError: When connection to HTTP server fails
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
                "timeState": time_state.model_dump(mode='json'),
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
                "viewportState": viewport_state.model_dump(mode='json'),
                "filename": filename
            }
        }
        self._client.send_json_message(command)


# Global API instance for easy access with auto-completion
debrief = DebriefAPI()