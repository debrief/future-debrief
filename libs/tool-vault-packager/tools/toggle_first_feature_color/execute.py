"""Feature color toggling tool for GeoJSON FeatureCollections."""

import copy
from typing import Dict, Any
from pydantic import BaseModel, Field, model_validator


class ToggleFirstFeatureColorParameters(BaseModel):
    """Parameters for the toggle_first_feature_color tool."""

    feature_collection: Dict[str, Any] = Field(
        json_schema_extra={
            "$ref": "https://example.org/debrief/schemas/features/FeatureCollection.schema.json"
        },
        description="A GeoJSON FeatureCollection object conforming to the Debrief FeatureCollection schema",
        examples=[
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": "feature_001",
                        "properties": {"color": "red"},
                        "geometry": {"type": "Point", "coordinates": [0, 0]}
                    }
                ]
            }
        ]
    )

    @model_validator(mode='after')
    def validate_feature_collection(self):
        """Validate basic GeoJSON FeatureCollection structure."""
        fc_data = self.feature_collection

        # Basic validation for GeoJSON FeatureCollection
        if not isinstance(fc_data, dict):
            raise ValueError("Feature collection must be a dictionary")

        if fc_data.get("type") != "FeatureCollection":
            raise ValueError("Feature collection must have type 'FeatureCollection'")

        if "features" not in fc_data:
            raise ValueError("Feature collection must have 'features' array")

        if not isinstance(fc_data["features"], list):
            raise ValueError("Features must be an array")

        return self


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
        ...             "properties": {"color": "red"},
        ...             "geometry": {"type": "Point", "coordinates": [0, 0]}
        ...         }]
        ...     }
        ... )
        >>> result = toggle_first_feature_color(params)
        >>> result["command"]
        'setFeatureCollection'
    """
    # Create a deep copy to avoid modifying the original
    result = copy.deepcopy(params.feature_collection)

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
        first_feature["properties"]["color"] = "blue"
    else:
        first_feature["properties"]["color"] = "red"

    # Return ToolVault command to update the feature collection
    return {
        "command": "setFeatureCollection",
        "payload": result
    }