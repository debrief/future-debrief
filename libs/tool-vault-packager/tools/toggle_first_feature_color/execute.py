"""Feature color toggling tool for GeoJSON FeatureCollections."""

import copy
from typing import Dict, Any
from pydantic import BaseModel, Field, ValidationError
from debrief.types.features import DebriefFeatureCollection


class ToggleFirstFeatureColorParameters(BaseModel):
    """Parameters for the toggle_first_feature_color tool."""

    feature_collection: DebriefFeatureCollection = Field(
        description="A GeoJSON FeatureCollection object conforming to the Debrief FeatureCollection schema",
        examples=[
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": "feature_001",
                        "properties": {"color": "red", "dataType": "point"},
                        "geometry": {"type": "Point", "coordinates": [0, 0]}
                    }
                ]
            }
        ]
    )


def toggle_first_feature_color(params: ToggleFirstFeatureColorParameters) -> Dict[str, Any]:
    """
    Toggle the color property of the first feature in a GeoJSON FeatureCollection.

    This function modifies the first feature in the provided FeatureCollection by
    toggling its color property between 'red' and 'blue'. If the first feature
    doesn't have a color property, it will be set to 'red'. If the collection
    is empty, it returns an appropriate message. Returns a ToolVault command to
    update the features.

    Args:
        params: ToggleFirstFeatureColorParameters containing feature_collection

    Returns:
        Dict[str, Any]: ToolVault command object containing the modified FeatureCollection
                       or appropriate message

    Examples:
        >>> from pydantic import ValidationError
        >>> params = ToggleFirstFeatureColorParameters(
        ...     feature_collection={
        ...         "type": "FeatureCollection",
        ...         "features": [{
        ...             "type": "Feature",
        ...             "properties": {"color": "red", "dataType": "point"},
        ...             "geometry": {"type": "Point", "coordinates": [0, 0]}
        ...         }]
        ...     }
        ... )
        >>> result = toggle_first_feature_color(params)
        >>> result["command"]
        'setFeatureCollection'
    """
    try:
        # Work with the validated DebriefFeatureCollection directly
        feature_collection = params.feature_collection

        # Check if the collection has features
        if not feature_collection.features or len(feature_collection.features) == 0:
            return {
                "command": "showText",
                "payload": "No features found in the collection to toggle color"
            }

        # Convert to dict for modification (since we need to return a dict)
        result = feature_collection.model_dump()
        first_feature = result["features"][0]

        # Ensure the feature has properties (it should due to pydantic validation)
        if "properties" not in first_feature:
            first_feature["properties"] = {}

        # Toggle the color property
        current_color = first_feature["properties"].get("color", "blue")
        if current_color == "red":
            first_feature["properties"]["color"] = "blue"
        else:
            first_feature["properties"]["color"] = "red"

        # Return ToolVault command to update the feature collection
        return {
            "command": "setFeatureCollection",
            "payload": result
        }

    except ValidationError as e:
        return {
            "command": "showText",
            "payload": f"Input validation failed: {e.errors()[0]['msg']} at {e.errors()[0]['loc']}"
        }
    except ValueError as e:
        return {
            "command": "showText",
            "payload": f"Invalid feature collection data: {str(e)}"
        }
    except Exception as e:
        return {
            "command": "showText",
            "payload": f"Color toggle failed: {str(e)}"
        }