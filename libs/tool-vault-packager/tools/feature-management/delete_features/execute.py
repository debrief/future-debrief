"""Delete selected features from a FeatureCollection."""

from typing import List

# Use hierarchical imports from shared-types
from debrief.types.features import DebriefFeature
from debrief.types.tools import DeleteFeaturesCommand
from pydantic import BaseModel, Field


class DeleteFeaturesParameters(BaseModel):
    """Parameters for delete_features tool."""

    features: List[DebriefFeature] = Field(
        description="Array of Debrief features to delete",
        examples=[
            [
                {
                    "type": "Feature",
                    "id": "track-001",
                    "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
                    "properties": {"dataType": "track"},
                }
            ]
        ],
    )


def delete_features(params: DeleteFeaturesParameters) -> DeleteFeaturesCommand:
    """
    Delete selected features from the current plot.

    Extracts feature IDs from the selected features and returns a command
    to delete them from the FeatureCollection.

    Args:
        params: DeleteFeaturesParameters with features to delete

    Returns:
        DeleteFeaturesCommand with list of feature IDs to delete

    Examples:
        >>> params = DeleteFeaturesParameters(features=[{"type": "Feature", "id": "feature-1", ...}])
        >>> result = delete_features(params)
        >>> result.command
        'deleteFeatures'
        >>> result.payload
        ['feature-1']
    """
    # Extract feature IDs from input features and convert to strings
    feature_ids = [str(f.id) for f in params.features if f.id is not None]

    # Return DeleteFeaturesCommand
    return DeleteFeaturesCommand(payload=feature_ids)
