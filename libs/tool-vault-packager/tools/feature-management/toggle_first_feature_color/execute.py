"""Feature color toggling tool for GeoJSON FeatureCollections."""

from debrief.types.features import DebriefFeatureCollection
from debrief.types.tools import (
    DebriefCommand,
    ShowTextCommand,
    UpdateFeaturesCommand,
)
from pydantic import BaseModel, Field, ValidationError


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
                        "geometry": {"type": "Point", "coordinates": [0, 0]},
                    }
                ],
            }
        ],
    )


def toggle_first_feature_color(params: ToggleFirstFeatureColorParameters) -> DebriefCommand:
    """
    Toggle the color property of the first feature in a GeoJSON FeatureCollection.

    This function modifies the first feature in the provided FeatureCollection by
    toggling its color property between 'red' and 'blue'. If the first feature
    doesn't have a color property, it will be set to 'red'. If the collection
    is empty, it returns an appropriate message. Returns a ToolVault command to
    update only the modified feature.

    Args:
        params: ToggleFirstFeatureColorParameters containing feature_collection

    Returns:
        DebriefCommand: Command to update the modified feature (not replace entire collection)

    Examples:
        >>> from pydantic import ValidationError
        >>> params = ToggleFirstFeatureColorParameters(
        ...     feature_collection={
        ...         "type": "FeatureCollection",
        ...         "features": [{
        ...             "type": "Feature",
        ...             "id": "feature1",
        ...             "properties": {"color": "red", "dataType": "point"},
        ...             "geometry": {"type": "Point", "coordinates": [0, 0]}
        ...         }]
        ...     }
        ... )
        >>> result = toggle_first_feature_color(params)
        >>> result.command
        'updateFeatures'
    """
    try:
        # Work with the validated DebriefFeatureCollection directly
        feature_collection = params.feature_collection

        # Check if the collection has features
        if not feature_collection.features or len(feature_collection.features) == 0:
            return ShowTextCommand(
                payload="No features found in the collection to toggle color",
            )

        # Get the first feature (already validated as a DebriefFeature)
        first_feature = feature_collection.features[0]

        # Convert to dict for modification (use by_alias=True to get JSON keys like "marker-color")
        feature_dict = first_feature.model_dump(by_alias=True)

        # Ensure the feature has properties (it should due to pydantic validation)
        if "properties" not in feature_dict:
            feature_dict["properties"] = {}

        # Determine the feature type and appropriate color property
        data_type = feature_dict["properties"].get("dataType", "")

        # Define color property based on feature type and CSS color codes
        if data_type == "reference-point":
            color_property = "marker-color"
            red_color = "#FF0000"
            blue_color = "#0000FF"
        elif data_type == "buoyfield":
            color_property = "marker-color"
            red_color = "#FF0000"
            blue_color = "#0000FF"
        elif data_type == "track":
            color_property = "stroke"
            red_color = "#FF0000"
            blue_color = "#0000FF"
        elif data_type == "zone":
            color_property = "fill"
            red_color = "#FF0000"
            blue_color = "#0000FF"
        else:
            # For annotation and other types, use color property
            color_property = "color"
            red_color = "#FF0000"
            blue_color = "#0000FF"

        # Toggle the color property
        current_color = feature_dict["properties"].get(color_property, blue_color)
        if current_color == red_color or current_color == "red" or current_color == "#FF0000":
            feature_dict["properties"][color_property] = blue_color
        else:
            feature_dict["properties"][color_property] = red_color

        # Re-validate the feature directly using the appropriate feature class
        # Since we know the dataType, we can validate it directly without going through the union
        data_type = feature_dict["properties"].get("dataType", "")

        # Just return the feature dict directly in the UpdateFeaturesCommand
        # The command will handle validation
        from debrief.types.features.annotation import DebriefAnnotationFeature
        from debrief.types.features.point import DebriefPointFeature
        from debrief.types.features.track import DebriefTrackFeature

        # Validate using the specific feature type
        if data_type == "reference-point":
            validated_feature = DebriefPointFeature.model_validate(feature_dict)
        elif data_type == "track":
            validated_feature = DebriefTrackFeature.model_validate(feature_dict)
        elif data_type == "annotation":
            validated_feature = DebriefAnnotationFeature.model_validate(feature_dict)
        else:
            # For other types, try validating through the collection
            updated_collection = DebriefFeatureCollection.model_validate(
                {"type": "FeatureCollection", "features": [feature_dict]}
            )
            validated_feature = updated_collection.features[0]

        # Return UpdateFeaturesCommand with the validated feature
        # We need to serialize with aliases and re-parse to get proper JSON keys
        feature_json = validated_feature.model_dump(by_alias=True, mode="json")

        return UpdateFeaturesCommand.model_construct(
            command="updateFeatures", payload=[feature_json]
        )

    except ValidationError as e:
        return ShowTextCommand(
            payload=f"Input validation failed: {e.errors()[0]['msg']} at {e.errors()[0]['loc']}",
        )
    except ValueError as e:
        return ShowTextCommand(payload=f"Invalid feature collection data: {str(e)}")
    except Exception as e:
        return ShowTextCommand(payload=f"Color toggle failed: {str(e)}")
