"""Feature color toggling tool for GeoJSON FeatureCollections."""

import copy
from typing import Dict, Any


def toggle_first_feature_color(feature_collection: Dict[str, Any]) -> Dict[str, Any]:
    """
    Toggle the color property of the first feature in a GeoJSON FeatureCollection.
    
    This function modifies the first feature in the provided FeatureCollection by
    toggling its color property between 'red' and 'blue'. If the first feature
    doesn't have a color property, it will be set to 'red'. If the collection
    is empty, it returns the collection unchanged.
    
    Args:
        feature_collection (Dict[str, Any]): A GeoJSON FeatureCollection object
                                           conforming to the Debrief FeatureCollection schema
        
    Returns:
        Dict[str, Any]: The modified FeatureCollection with the first feature's
                       color property toggled
        
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
        >>> result["features"][0]["properties"]["color"]
        'blue'
    """
    # Create a deep copy to avoid modifying the original
    result = copy.deepcopy(feature_collection)
    
    # Check if the collection has features
    if not result.get("features") or len(result["features"]) == 0:
        return result
    
    first_feature = result["features"][0]
    
    # Ensure the feature has properties
    if "properties" not in first_feature:
        first_feature["properties"] = {}
    
    # Toggle the color property
    current_color = first_feature["properties"].get("color", "blue")
    if current_color == "red":
        first_feature["properties"]["color"] = "blue"
    else:
        first_feature["properties"]["color"] = "red"
    
    return result