"""Viewport grid generator tool for maritime analysis."""

from typing import Dict, Any, List


def viewport_grid_generator(viewport_bounds: List[float], lat_interval: float, lon_interval: float) -> Dict[str, Any]:
    """
    Generate a grid of points within a viewport area at specified intervals.

    This function creates a MultiPoint GeoJSON feature containing a regular grid
    of points within the specified viewport bounds. The grid spacing is determined
    by the latitude and longitude interval parameters. Points are generated at
    regular intervals starting from the southwest corner of the viewport.

    Args:
        viewport_bounds (List[float]): Viewport bounds as [west, south, east, north]
                                      in decimal degrees
        lat_interval (float): Latitude interval between grid points in decimal degrees
        lon_interval (float): Longitude interval between grid points in decimal degrees

    Returns:
        Dict[str, Any]: ToolVault command object to add the generated MultiPoint
                       feature to the current feature collection

    Examples:
        >>> bounds = [-1.0, -1.0, 1.0, 1.0]
        >>> result = viewport_grid_generator(bounds, 0.5, 0.5)
        >>> result["command"]
        'addFeatures'
        >>> len(result["payload"])
        1
        >>> result["payload"][0]["geometry"]["type"]
        'MultiPoint'
    """
    # Validate input parameters
    if not isinstance(viewport_bounds, list) or len(viewport_bounds) != 4:
        return {
            "command": "showText",
            "payload": "Invalid viewport_bounds: must be a list of 4 numbers [west, south, east, north]"
        }

    try:
        west, south, east, north = viewport_bounds
        west, south, east, north = float(west), float(south), float(east), float(north)
    except (ValueError, TypeError):
        return {
            "command": "showText",
            "payload": "Invalid viewport_bounds: all values must be numeric"
        }

    if west >= east:
        return {
            "command": "showText",
            "payload": "Invalid viewport_bounds: west must be less than east"
        }

    if south >= north:
        return {
            "command": "showText",
            "payload": "Invalid viewport_bounds: south must be less than north"
        }

    if not isinstance(lat_interval, (int, float)) or lat_interval <= 0:
        return {
            "command": "showText",
            "payload": "Invalid lat_interval: must be a positive number"
        }

    if not isinstance(lon_interval, (int, float)) or lon_interval <= 0:
        return {
            "command": "showText",
            "payload": "Invalid lon_interval: must be a positive number"
        }

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