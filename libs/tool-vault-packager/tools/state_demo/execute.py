"""Demonstration tool for state management commands."""

from typing import Dict, Any, List, Literal, Optional
from pydantic import BaseModel, Field
import sys
import os

# Add parent directory to path to import debrief_api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from debrief_api import set_viewport, set_selection, set_time, focus_on_features, show_message


class StateDemoParameters(BaseModel):
    """Parameters for the state demonstration tool."""

    action: Literal["viewport", "selection", "time", "focus"] = Field(
        description="Type of state action to demonstrate",
        examples=["viewport", "selection", "time", "focus"]
    )

    feature_ids: Optional[List[str]] = Field(
        default=None,
        description="Feature IDs for selection/focus actions",
        examples=[["track-001", "point-042"]]
    )

    center_lng: Optional[float] = Field(
        default=None,
        description="Longitude for viewport center",
        examples=[-0.09]
    )

    center_lat: Optional[float] = Field(
        default=None,
        description="Latitude for viewport center",
        examples=[51.505]
    )

    zoom: Optional[int] = Field(
        default=None,
        description="Zoom level for viewport",
        examples=[13]
    )


def state_demo(params: StateDemoParameters) -> Dict[str, Any]:
    """
    Demonstrate state management commands for Debrief maritime analysis.

    This tool shows how to use the new state management capabilities to control
    viewport, selection, time state, and combined operations from Python tools.

    Args:
        params: StateDemoParameters containing action type and optional parameters

    Returns:
        Dict[str, Any]: ToolVault command object or composite command

    Examples:
        >>> params = StateDemoParameters(action="viewport", center_lng=-0.09, center_lat=51.505, zoom=13)
        >>> result = state_demo(params)
        >>> result["command"]
        'setViewport'
    """
    try:
        if params.action == "viewport":
            if params.center_lng is not None and params.center_lat is not None:
                return set_viewport(
                    center=(params.center_lng, params.center_lat),
                    zoom=params.zoom
                )
            else:
                return show_message("Viewport action requires center_lng and center_lat parameters")

        elif params.action == "selection":
            if params.feature_ids:
                return set_selection(params.feature_ids)
            else:
                return show_message("Selection action requires feature_ids parameter")

        elif params.action == "time":
            # Demonstrate time state update
            return set_time(
                current="2024-01-01T12:00:00Z",
                start="2024-01-01T00:00:00Z",
                end="2024-01-01T23:59:59Z"
            )

        elif params.action == "focus":
            if params.feature_ids:
                # Return composite command for select + zoom
                commands = focus_on_features(params.feature_ids)
                return {
                    "command": "composite",
                    "payload": commands
                }
            else:
                return show_message("Focus action requires feature_ids parameter")

        else:
            return show_message(f"Unknown action: {params.action}")

    except Exception as e:
        return show_message(f"State demo failed: {str(e)}")