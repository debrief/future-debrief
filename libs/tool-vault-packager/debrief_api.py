"""
Debrief API utilities for tool-vault-packager tools.

This module provides convenient functions for tools to generate ToolVault commands
that interact with the Debrief VS Code extension state management system.
"""

from typing import List, Optional, Dict, Any, Literal, Tuple
from debrief.types.states.time_state import TimeState
from debrief.types.states.viewport_state import ViewportState
from debrief.types.states.selection_state import SelectionState
from debrief.types.states.editor_state import EditorState


def set_viewport(
    center: Optional[Tuple[float, float]] = None,
    zoom: Optional[int] = None,
    bounds: Optional[Tuple[Tuple[float, float], Tuple[float, float]]] = None
) -> Dict[str, Any]:
    """
    Create a setViewport command to update the map viewport.

    Args:
        center: Map center as (longitude, latitude) tuple
        zoom: Map zoom level
        bounds: Map bounds as ((west, south), (east, north)) tuple

    Returns:
        ToolVault command object for viewport update

    Examples:
        >>> set_viewport(center=(-0.09, 51.505), zoom=13)
        {'command': 'setViewport', 'payload': {'center': [-0.09, 51.505], 'zoom': 13, 'bounds': None}}

        >>> set_viewport(bounds=((-0.1, 51.49), (-0.08, 51.52)))
        {'command': 'setViewport', 'payload': {'center': None, 'zoom': None, 'bounds': [[-0.1, 51.49], [-0.08, 51.52]]}}
    """
    payload = {
        "center": list(center) if center else None,
        "zoom": zoom,
        "bounds": [list(bounds[0]), list(bounds[1])] if bounds else None
    }

    return {
        "command": "setViewport",
        "payload": payload
    }


def set_selection(
    feature_ids: List[str],
    selection_type: Literal["replace", "add", "remove"] = "replace"
) -> Dict[str, Any]:
    """
    Create a setSelection command to update feature selection.

    Args:
        feature_ids: List of feature IDs to select
        selection_type: Type of selection operation ("replace", "add", or "remove")

    Returns:
        ToolVault command object for selection update

    Examples:
        >>> set_selection(["track-001", "point-042"])
        {'command': 'setSelection', 'payload': {'featureIds': ['track-001', 'point-042'], 'selectionType': 'replace'}}

        >>> set_selection(["feature-123"], selection_type="add")
        {'command': 'setSelection', 'payload': {'featureIds': ['feature-123'], 'selectionType': 'add'}}
    """
    payload = {
        "featureIds": feature_ids,
        "selectionType": selection_type
    }

    return {
        "command": "setSelection",
        "payload": payload
    }


def set_state(
    time_state: Optional[TimeState] = None,
    editor_state: Optional[EditorState] = None,
    ui_state: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a setState command to update multiple state components.

    Args:
        time_state: Time state to update
        editor_state: Editor state to update
        ui_state: UI state to update

    Returns:
        ToolVault command object for state update

    Examples:
        >>> from debrief.types.states.time_state import TimeState
        >>> time_state = TimeState(
        ...     current="2024-01-01T12:00:00Z",
        ...     start="2024-01-01T00:00:00Z",
        ...     end="2024-01-01T23:59:59Z"
        ... )
        >>> set_state(time_state=time_state)
        {'command': 'setState', 'payload': {'timeState': {...}, 'editorState': None, 'uiState': None}}
    """
    payload = {
        "timeState": time_state.model_dump() if time_state else None,
        "editorState": editor_state.model_dump() if editor_state else None,
        "uiState": ui_state
    }

    return {
        "command": "setState",
        "payload": payload
    }


def set_time(
    current: str,
    start: str,
    end: str
) -> Dict[str, Any]:
    """
    Create a setState command to update time state (convenience function).

    Args:
        current: Current time position as ISO 8601 string
        start: Start time of the range as ISO 8601 string
        end: End time of the range as ISO 8601 string

    Returns:
        ToolVault command object for time state update

    Examples:
        >>> set_time("2024-01-01T12:00:00Z", "2024-01-01T00:00:00Z", "2024-01-01T23:59:59Z")
        {'command': 'setState', 'payload': {'timeState': {...}, 'editorState': None, 'uiState': None}}
    """
    time_state = TimeState(current=current, start=start, end=end)
    return set_state(time_state=time_state)


def focus_on_features(feature_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Create a composite command to select features and zoom to them.

    Args:
        feature_ids: List of feature IDs to focus on

    Returns:
        List of ToolVault command objects for selection and zoom

    Examples:
        >>> focus_on_features(["track-001", "point-042"])
        [{'command': 'setSelection', 'payload': {...}}, {'command': 'zoomToSelection', 'payload': {}}]
    """
    return [
        set_selection(feature_ids),
        {
            "command": "zoomToSelection",
            "payload": {}
        }
    ]


def show_message(message: str) -> Dict[str, Any]:
    """
    Create a showText command to display a message to the user.

    Args:
        message: Message to display

    Returns:
        ToolVault command object for message display

    Examples:
        >>> show_message("Analysis complete!")
        {'command': 'showText', 'payload': 'Analysis complete!'}
    """
    return {
        "command": "showText",
        "payload": message
    }