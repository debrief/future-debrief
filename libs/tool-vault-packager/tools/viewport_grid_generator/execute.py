"""Viewport grid generator tool for maritime analysis."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field, field_validator


class ViewportGridGeneratorParameters(BaseModel):
    """Parameters for the viewport_grid_generator tool."""

    viewport_bounds: List[float] = Field(
        description="Viewport bounds as [west, south, east, north] in decimal degrees",
        min_length=4,
        max_length=4,
        examples=[
            [-1.0, -1.0, 1.0, 1.0],
            [-122.5, 37.7, -122.3, 37.9],
            [0.0, 50.0, 2.0, 52.0]
        ]
    )

    lat_interval: float = Field(
        description="Latitude interval between grid points in decimal degrees",
        gt=0.0,
        examples=[0.1, 0.5, 1.0]
    )

    lon_interval: float = Field(
        description="Longitude interval between grid points in decimal degrees",
        gt=0.0,
        examples=[0.1, 0.5, 1.0]
    )

    @field_validator('viewport_bounds')
    @classmethod
    def validate_viewport_bounds(cls, v):
        """Validate viewport bounds structure and values."""
        if len(v) != 4:
            raise ValueError("viewport_bounds must contain exactly 4 values [west, south, east, north]")

        west, south, east, north = v

        if west >= east:
            raise ValueError("west must be less than east")

        if south >= north:
            raise ValueError("south must be less than north")

        # Basic longitude range check
        if west < -180 or east > 180 or west > 180 or east < -180:
            raise ValueError("longitude values must be between -180 and 180")

        # Basic latitude range check
        if south < -90 or north > 90 or south > 90 or north < -90:
            raise ValueError("latitude values must be between -90 and 90")

        return v


def viewport_grid_generator(params: ViewportGridGeneratorParameters) -> Dict[str, Any]:
    """
    Generate a grid of points within a viewport area at specified intervals.

    This function creates a MultiPoint GeoJSON feature containing a regular grid
    of points within the specified viewport bounds. The grid spacing is determined
    by the latitude and longitude interval parameters. Points are generated at
    regular intervals starting from the southwest corner of the viewport.

    Args:
        params: ViewportGridGeneratorParameters containing viewport_bounds, lat_interval, and lon_interval

    Returns:
        Dict[str, Any]: ToolVault command object to add the generated MultiPoint
                       feature to the current feature collection

    Examples:
        >>> from pydantic import ValidationError
        >>> params = ViewportGridGeneratorParameters(
        ...     viewport_bounds=[-1.0, -1.0, 1.0, 1.0],
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
    # Extract validated parameters
    viewport_bounds = params.viewport_bounds
    lat_interval = params.lat_interval
    lon_interval = params.lon_interval

    west, south, east, north = viewport_bounds

    # Check for reasonable intervals to prevent excessive point generation
    max_points = 10000  # Reasonable limit to prevent browser overload
    estimated_lat_points = int((north - south) / lat_interval) + 1
    estimated_lon_points = int((east - west) / lon_interval) + 1
    estimated_total_points = estimated_lat_points * estimated_lon_points

    if estimated_total_points > max_points:
        return {
            "command": "showText",
            "payload": f"Grid would generate {estimated_total_points} points (max: {max_points}). "
                      f"Please increase intervals or reduce viewport size."
        }

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
        return {
            "command": "showText",
            "payload": "No grid points generated. Check interval values and viewport bounds."
        }

    # Create MultiPoint feature
    multipoint_feature = {
        "type": "Feature",
        "id": "generated_grid",
        "geometry": {
            "type": "MultiPoint",
            "coordinates": grid_points
        },
        "properties": {
            "dataType": "zone",
            "annotationType": "boundary",
            "name": "Generated Grid",
            "description": f"Grid with {len(grid_points)} points at {lat_interval}° lat × {lon_interval}° lon intervals",
            "color": "#0066CC"
        }
    }

    return {
        "command": "addFeatures",
        "payload": [multipoint_feature]
    }