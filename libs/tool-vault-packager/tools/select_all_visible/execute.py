"""Select all features that are visible within the current viewport bounds."""

from typing import Any, List, Union

# Use hierarchical imports from shared-types
from debrief.types.features import DebriefFeatureCollection
from debrief.types.states.selection_state import SelectionState
from debrief.types.states.viewport_state import ViewportState
from debrief.types.tools import SetSelectionCommand, ShowTextCommand, ToolVaultCommand
from pydantic import BaseModel, Field, field_validator


class SelectAllVisibleParameters(BaseModel):
    """Parameters for select-all-visible tool."""

    # Use DebriefFeatureCollection type for auto-injection, but accept unvalidated data
    # The validator converts it to a plain dict to handle custom dataTypes
    feature_collection: DebriefFeatureCollection = Field(
        description="GeoJSON FeatureCollection containing features to check for visibility",
        examples=[
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": "track-001",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[-1.0, 52.0], [-1.1, 52.1]],
                        },
                        "properties": {"dataType": "track", "name": "Track 1"},
                    }
                ],
            }
        ],
    )

    viewport_state: ViewportState = Field(
        description="Current viewport state with bounds [west, south, east, north]",
        examples=[{"bounds": [-2.0, 51.0, 0.0, 53.0]}],
    )

    @field_validator("feature_collection", mode="before")
    @classmethod
    def accept_unvalidated_fc(cls, v: Any) -> Any:
        """Accept feature collection as-is without strict validation.

        This allows custom dataType values that aren't in the strict union.
        We return the raw dict instead of a validated Pydantic model.
        """
        # If it's already a dict or DebriefFeatureCollection, pass it through
        if isinstance(v, (dict, DebriefFeatureCollection)):
            # Convert to dict if it's a Pydantic model
            if isinstance(v, DebriefFeatureCollection):
                return v.model_dump()
            return v
        return v


def select_all_visible(params: SelectAllVisibleParameters) -> ToolVaultCommand:
    """
    Select all features that are visible within the current viewport bounds.

    Analyzes the viewport bounds and feature geometries to determine which
    features are contained within or overlap with the current viewport.
    Returns a setSelection command with the IDs of all visible features.

    Args:
        params: Parameters containing feature_collection and viewport_state

    Returns:
        SetSelectionCommand to update the selection with visible feature IDs
    """
    try:
        # Check if we have viewport bounds (Pydantic model access)
        if not params.viewport_state or not params.viewport_state.bounds:
            return ShowTextCommand(
                payload="No viewport bounds available",
            )

        # feature_collection is a dict (from validator), access as dict
        fc_dict = (
            params.feature_collection
            if isinstance(params.feature_collection, dict)
            else params.feature_collection.model_dump()
        )

        # Check if we have features (Dict access)
        if not fc_dict or not fc_dict.get("features"):
            return ShowTextCommand(payload="No features available")

        # Extract viewport bounds [west, south, east, north] (Pydantic model access)
        viewport_bounds = params.viewport_state.bounds
        west, south, east, north = viewport_bounds

        # Find features that are visible (intersect with viewport)
        visible_feature_ids: List[Union[str, int]] = []

        def bounds_intersect(
            feature_west: float, feature_south: float, feature_east: float, feature_north: float
        ) -> bool:
            """Check if feature bounds intersect with viewport bounds."""
            return not (
                feature_east < west
                or feature_west > east
                or feature_north < south
                or feature_south > north
            )

        def get_feature_bounds(coordinates):
            """Calculate bounds for any geometry type."""
            min_lng, min_lat = float("inf"), float("inf")
            max_lng, max_lat = float("-inf"), float("-inf")

            def process_coords(coords):
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
                        process_coords(coord)

            process_coords(coordinates)
            return min_lng, min_lat, max_lng, max_lat

        # Check each feature for visibility (dict access)
        for feature in fc_dict["features"]:
            geometry = feature.get("geometry")
            if not geometry or "coordinates" not in geometry:
                continue

            coordinates = geometry["coordinates"]
            if not coordinates:
                continue

            try:
                # Calculate feature bounds
                feature_west, feature_south, feature_east, feature_north = get_feature_bounds(
                    coordinates
                )

                # Check if feature bounds intersect with viewport bounds
                if bounds_intersect(feature_west, feature_south, feature_east, feature_north):
                    # Feature is visible - add its ID
                    feature_id = (
                        feature.get("id")
                        if feature.get("id") is not None
                        else f"feature_{len(visible_feature_ids)}"
                    )
                    visible_feature_ids.append(feature_id)

            except Exception:
                # Skip features with invalid geometry
                continue

        # Create selection state with visible feature IDs
        selection_state = SelectionState(selectedIds=visible_feature_ids)

        # Return setSelection command
        return SetSelectionCommand(payload=selection_state)

    except Exception as e:
        return ShowTextCommand(payload=f"Error selecting visible features: {str(e)}")
