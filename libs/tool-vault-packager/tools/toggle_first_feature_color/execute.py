"""Feature color toggling tool for GeoJSON FeatureCollections."""

import copy
from typing import Dict, Any


def toggle_first_feature_color(feature_collection: Dict[str, Any]) -> Dict[str, Any]:
    """
    Toggle the color property of the first feature in a GeoJSON FeatureCollection.

    This function modifies the first feature in the provided FeatureCollection by
    toggling its color property between 'red' and 'blue'. If the first feature
    doesn't have a color property, it will be set to 'red'. If the collection
    is empty, it returns an appropriate message. Returns a ToolVault command to
    update the features.

    Args:
        feature_collection (Dict[str, Any]): A GeoJSON FeatureCollection object
                                           conforming to the Debrief FeatureCollection schema

    Returns:
        Dict[str, Any]: ToolVault command object containing the modified FeatureCollection
                       or appropriate message

    Examples:
        >>> fc = {
        ...     "type": "FeatureCollection",
        ...     "features": [{
        ...         "type": "Feature",
        ...         "properties": {"color": "red"},
        ...         "geometry": {"type": "Point", "coordinates": [0, 0]}
        ...     }]
        ... }
        >>> result = toggle_first_feature_color(fc)
        >>> result["command"]
        'setFeatureCollection'
    """
    # Create a deep copy to avoid modifying the original
    result = copy.deepcopy(feature_collection)

    # Check if the collection has features
    if not result.get("features") or len(result["features"]) == 0:
        return {
            "command": "showText",
            "payload": "No features found in the collection to toggle color"
        }

    first_feature = result["features"][0]

    # Ensure the feature has properties
    if "properties" not in first_feature:
        first_feature["properties"] = {}

    # Toggle the color property
    current_color = first_feature["properties"].get("color", "blue")
    if current_color == "red":
        new_color = "blue"
        first_feature["properties"]["color"] = "blue"
    else:
        new_color = "red"
        first_feature["properties"]["color"] = "red"

    # Return ToolVault command to update the feature collection
    return {
        "command": "setFeatureCollection",
        "payload": result
    }