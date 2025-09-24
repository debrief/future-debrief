"""Calculate bounds of features and set viewport to fit them."""

from typing import List

# Use hierarchical imports from shared-types
from debrief.types.features import DebriefFeature
from debrief.types.tools import ToolVaultCommand
from debrief.types.tools.tool_call_response import CommandType
from pydantic import BaseModel, Field


class FitToSelectionParameters(BaseModel):
    """Parameters for fit-to-selection tool."""

    features: List[DebriefFeature] = Field(
        description="Array of Debrief features to calculate bounds for",
        examples=[
            [
                {
                    "type": "Feature",
                    "id": "track-001",
                    "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
                    "properties": {"dataType": "track"},
                }
            ]
        ],
    )

    padding: float = Field(
        default=0.1,
        description="Additional padding around bounds as percentage (0.1 = 10%)",
        examples=[0.1, 0.05, 0.2],
    )


def fit_to_selection(params: FitToSelectionParameters) -> ToolVaultCommand:
    """
    Calculate bounds of features and set viewport to fit them.

    Analyzes the geometry coordinates of all features to determine the
    bounding box, then sets the ViewportState to fit all features.

    Args:
        params: Features to analyze and optional padding

    Returns:
        SetViewportCommand to update the viewport bounds
    """
    try:
        if not params.features:
            return ToolVaultCommand(
                command=CommandType.SHOW_TEXT, payload="No features provided to fit viewport"
            )

        # Initialize bounds tracking
        min_lng, min_lat = float("inf"), float("inf")
        max_lng, max_lat = float("-inf"), float("-inf")

        def process_coordinates(coords):
            """Recursively process coordinates of any geometry type."""
            nonlocal min_lng, min_lat, max_lng, max_lat

            if isinstance(coords[0], (int, float)):
                # Single coordinate pair [lng, lat]
                lng, lat = coords[0], coords[1]
                min_lng = min(min_lng, lng)
                max_lng = max(max_lng, lng)
                min_lat = min(min_lat, lat)
                max_lat = max(max_lat, lat)
            else:
                # Array of coordinates - recurse
                for coord in coords:
                    process_coordinates(coord)

        # Process all feature geometries
        for feature in params.features:
            geometry = feature.geometry
            if not geometry:
                continue
            coords = getattr(geometry, "coordinates", [])

            if coords:
                process_coordinates(coords)

        # Check if we found any valid coordinates
        if min_lng == float("inf"):
            return ToolVaultCommand(
                command=CommandType.SHOW_TEXT, payload="No valid coordinates found in features"
            )

        # Apply padding
        lng_range = max_lng - min_lng
        lat_range = max_lat - min_lat

        # Ensure minimum range for very small or point features
        if lng_range < 0.001:
            lng_range = 0.001
        if lat_range < 0.001:
            lat_range = 0.001

        lng_padding = lng_range * params.padding
        lat_padding = lat_range * params.padding

        # Calculate bounds with padding [west, south, east, north]
        bounds = [
            min_lng - lng_padding,  # west
            min_lat - lat_padding,  # south
            max_lng + lng_padding,  # east
            max_lat + lat_padding,  # north
        ]

        # Create setViewport command
        return ToolVaultCommand(command=CommandType.SET_VIEWPORT, payload={"bounds": bounds})

    except Exception as e:
        return ToolVaultCommand(
            command=CommandType.SHOW_TEXT, payload=f"Error calculating feature bounds: {str(e)}"
        )
