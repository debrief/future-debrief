"""Viewport grid generator tool for maritime analysis."""

from debrief.types.states.viewport_state import ViewportState
from debrief.types.tools import AddFeaturesCommand, DebriefCommand, ShowTextCommand
from pydantic import BaseModel, Field, ValidationError


class ViewportGridGeneratorParameters(BaseModel):
    """Parameters for the viewport_grid_generator tool."""

    viewport_state: ViewportState = Field(
        description="Viewport state containing bounds as [west, south, east, north] in decimal degrees",
        examples=[
            {"bounds": [-1.0, -1.0, 1.0, 1.0]},
            {"bounds": [-122.5, 37.7, -122.3, 37.9]},
            {"bounds": [0.0, 50.0, 2.0, 52.0]},
        ],
    )

    lat_interval: float = Field(
        description="Latitude interval between grid points in decimal degrees",
        gt=0.0,
        examples=[0.1, 0.5, 1.0],
    )

    lon_interval: float = Field(
        description="Longitude interval between grid points in decimal degrees",
        gt=0.0,
        examples=[0.1, 0.5, 1.0],
    )


def viewport_grid_generator(params: ViewportGridGeneratorParameters) -> DebriefCommand:
    """
    Generate a grid of points within a viewport area at specified intervals.

    This function creates a MultiPoint GeoJSON feature containing a regular grid
    of points within the specified viewport bounds. The grid spacing is determined
    by the latitude and longitude interval parameters. Points are generated at
    regular intervals starting from the southwest corner of the viewport.

    Args:
        params: ViewportGridGeneratorParameters containing viewport_state, lat_interval, and lon_interval

    Returns:
        Dict[str, Any]: ToolVault command object to add the generated MultiPoint
                       feature to the current feature collection

    Examples:
        >>> from pydantic import ValidationError
        >>> params = ViewportGridGeneratorParameters(
        ...     viewport_state={"bounds": [-1.0, -1.0, 1.0, 1.0]},
        ...     lat_interval=0.5,
        ...     lon_interval=0.5
        ... )
        >>> result = viewport_grid_generator(params)
        >>> result["command"]
        'addFeatures'
        >>> len(result["payload"])
        1
        >>> result["payload"][0]["geometry"]["type"]
        'MultiPoint'
    """
    try:
        # Extract validated parameters from the ViewportState
        viewport_bounds = params.viewport_state.bounds
        lat_interval = params.lat_interval
        lon_interval = params.lon_interval

        west, south, east, north = viewport_bounds

        # Validate bounds relationship (ViewportState should already validate this but let's be explicit)
        if west >= east:
            return ShowTextCommand(
                payload=f"Invalid viewport bounds: west ({west}) must be less than east ({east})",
            )

        if south >= north:
            return ShowTextCommand(
                payload=f"Invalid viewport bounds: south ({south}) must be less than north ({north})",
            )

        # Check for reasonable intervals to prevent excessive point generation
        max_points = 10000  # Reasonable limit to prevent browser overload
        estimated_lat_points = int((north - south) / lat_interval) + 1
        estimated_lon_points = int((east - west) / lon_interval) + 1
        estimated_total_points = estimated_lat_points * estimated_lon_points

        if estimated_total_points > max_points:
            return ShowTextCommand(
                payload=f"Grid would generate {estimated_total_points} points (max: {max_points}). "
                f"Please increase intervals or reduce viewport size.",
            )

        # Generate grid points
        grid_points = []
        current_lat = south

        while current_lat <= north:
            current_lon = west
            while current_lon <= east:
                grid_points.append([current_lon, current_lat])
                current_lon += lon_interval
            current_lat += lat_interval

        if not grid_points:
            return ShowTextCommand(
                payload="No grid points generated. Check interval values and viewport bounds.",
            )

        # Create MultiPoint feature
        multipoint_feature = {
            "type": "Feature",
            "id": "generated_grid",
            "geometry": {"type": "MultiPoint", "coordinates": grid_points},
            "properties": {
                "dataType": "annotation",
                "annotationType": "boundary",
                "name": "Generated Grid",
                "description": f"Grid with {len(grid_points)} points at {lat_interval}° lat × {lon_interval}° lon intervals",
                "color": "#0066CC",
            },
        }

        return AddFeaturesCommand(payload=[multipoint_feature])

    except ValidationError as e:
        return ShowTextCommand(
            payload=f"Input validation failed: {e.errors()[0]['msg']} at {e.errors()[0]['loc']}",
        )
    except ValueError as e:
        return ShowTextCommand(payload=f"Invalid viewport data: {str(e)}")
    except Exception as e:
        return ShowTextCommand(payload=f"Grid generation failed: {str(e)}")
