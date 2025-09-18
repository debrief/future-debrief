"""Base tool interface defining the outer limits of tool input/output types."""

from typing import Dict, Any, List, Union, Literal, TypedDict

# Tool input parameter types - these define the "outer limits" of what tools can accept
ToolInput = Union[str, int, float, bool, Dict[str, Any], List[Any]]

# Import actual typed classes from shared-types package
# Fail hard if not available - no fallbacks to prevent downstream errors
from debrief.types.features.debrief_feature_collection import DebriefFeature, DebriefFeatureCollection

# Structured data type for showData command
class ShowDataPayload(TypedDict):
    shape: List[int]
    axes: List[Dict[str, Any]]
    values: List[Any]

# Image data type for showImage command
class ShowImagePayload(TypedDict):
    mediaType: Literal["image/png", "image/svg+xml"]
    data: str  # base64 encoded

# ToolVault command result types with compile-time type safety
class AddFeaturesResult(TypedDict):
    command: Literal["addFeatures"]
    payload: List[DebriefFeature]

class UpdateFeaturesResult(TypedDict):
    command: Literal["updateFeatures"]
    payload: List[DebriefFeature]

class DeleteFeaturesResult(TypedDict):
    command: Literal["deleteFeatures"]
    payload: List[str]  # Feature IDs

class SetFeatureCollectionResult(TypedDict):
    command: Literal["setFeatureCollection"]
    payload: DebriefFeatureCollection

class ShowTextResult(TypedDict):
    command: Literal["showText"]
    payload: str

class ShowDataResult(TypedDict):
    command: Literal["showData"]
    payload: ShowDataPayload

class ShowImageResult(TypedDict):
    command: Literal["showImage"]
    payload: ShowImagePayload

class LogMessageResult(TypedDict):
    command: Literal["logMessage"]
    payload: str

class CompositeResult(TypedDict):
    command: Literal["composite"]
    payload: List["ToolVaultResult"]  # Forward reference for recursive type

# Union of all possible ToolVault command result types
ToolVaultResult = Union[
    AddFeaturesResult, UpdateFeaturesResult, DeleteFeaturesResult,
    SetFeatureCollectionResult, ShowTextResult, ShowDataResult,
    ShowImageResult, LogMessageResult, CompositeResult
]


# Example tool implementations using properly typed structures:

def word_count(text: str) -> ShowTextResult:
    """
    Count the number of words in a given block of text.

    This function splits the input text by whitespace and returns the count
    of resulting words as a ToolVault showText command. Empty strings and strings
    containing only whitespace will return 0.

    Args:
        text (str): The input text block to count words from

    Returns:
        ShowTextResult: ToolVault command object with word count result

    Examples:
        >>> result = word_count("Hello world")
        >>> result["command"]
        'showText'
        >>> result["payload"]
        'Word count: 2'
    """
    if not text or not text.strip():
        count = 0
    else:
        count = len(text.strip().split())

    # TypedDict ensures compile-time verification of structure
    return ShowTextResult(
        command="showText",
        payload=f"Word count: {count}"
    )


def toggle_first_feature_color(feature_collection: DebriefFeatureCollection) -> Union[SetFeatureCollectionResult, ShowTextResult]:
    """
    Toggle the color property of the first feature in a GeoJSON FeatureCollection.

    This function modifies the first feature in the provided FeatureCollection by
    toggling its color property between 'red' and 'blue'. If the first feature
    doesn't have a color property, it will be set to 'red'. If the collection
    is empty, it returns an appropriate message. Returns a ToolVault command to
    update the features or show a message.

    Args:
        feature_collection (DebriefFeatureCollection): A properly typed DebriefFeatureCollection object
                                                       conforming to the maritime schema

    Returns:
        Union[SetFeatureCollectionResult, ShowTextResult]: ToolVault command object containing
                                                          the modified FeatureCollection or appropriate message

    Examples:
        >>> # Convert from dict if needed
        >>> fc_dict = {
        ...     "type": "FeatureCollection",
        ...     "features": [{
        ...         "type": "Feature",
        ...         "properties": {"color": "red"},
        ...         "geometry": {"type": "Point", "coordinates": [0, 0]}
        ...     }]
        ... }
        >>> fc = DebriefFeatureCollection.from_dict(fc_dict)
        >>> result = toggle_first_feature_color(fc)
        >>> result["command"]
        'setFeatureCollection'
    """
    import copy

    # Check if the collection has features
    if not feature_collection.features or len(feature_collection.features) == 0:
        return ShowTextResult(
            command="showText",
            payload="No features found in the collection to toggle color"
        )

    # Convert to dict for manipulation, then back to typed object
    fc_dict = feature_collection.to_dict()
    result = copy.deepcopy(fc_dict)
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

    # Convert back to proper DebriefFeatureCollection type with validation
    validated_collection = DebriefFeatureCollection.from_dict(result)

    # TypedDict ensures compile-time verification of structure
    return SetFeatureCollectionResult(
        command="setFeatureCollection",
        payload=validated_collection
    )


def example_show_data(data_points: List[float]) -> ShowDataResult:
    """
    Example tool showing how to return structured data for tabular display.

    Args:
        data_points (List[float]): Array of numeric data points

    Returns:
        ShowDataResult: ToolVault command object with structured data payload
    """
    return ShowDataResult(
        command="showData",
        payload=ShowDataPayload(
            shape=[len(data_points)],
            axes=[{"name": "index", "values": list(range(len(data_points)))}],
            values=data_points
        )
    )


def example_show_image(image_data: str) -> ShowImageResult:
    """
    Example tool showing how to return image data.

    Args:
        image_data (str): Base64 encoded PNG image data

    Returns:
        ShowImageResult: ToolVault command object with image payload
    """
    return ShowImageResult(
        command="showImage",
        payload=ShowImagePayload(
            mediaType="image/png",
            data=image_data
        )
    )