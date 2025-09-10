"""
Python Validators for Debrief Shared Types
Manual validators that work with generated types
"""

# Track validators
from .track_validator import (
    validate_timestamps_length,
    validate_track_feature,
    validate_linestring_coordinates,
    validate_multilinestring_coordinates,
    validate_track_feature_comprehensive,
    is_valid_datetime_string
)

# Point validators
from .point_validator import (
    validate_time_properties,
    validate_point_feature,
    is_valid_date as is_valid_point_date,
    validate_geographic_coordinates,
    validate_point_feature_comprehensive
)

# Annotation validators
from .annotation_validator import (
    validate_color_format,
    validate_annotation_type,
    validate_annotation_feature,
    validate_geometry_coordinates,
    validate_annotation_feature_comprehensive
)

# FeatureCollection validators
from .featurecollection_validator import (
    validate_bbox,
    validate_feature_collection,
    classify_feature,
    validate_feature_by_type,
    validate_feature_collection_properties,
    get_feature_counts,
    validate_feature_collection_comprehensive
)

__all__ = [
    # Track validators
    'validate_timestamps_length',
    'validate_track_feature',
    'validate_linestring_coordinates', 
    'validate_multilinestring_coordinates',
    'validate_track_feature_comprehensive',
    'is_valid_datetime_string',
    
    # Point validators
    'validate_time_properties',
    'validate_point_feature',
    'is_valid_point_date',
    'validate_geographic_coordinates',
    'validate_point_feature_comprehensive',
    
    # Annotation validators
    'validate_color_format',
    'validate_annotation_type',
    'validate_annotation_feature',
    'validate_geometry_coordinates',
    'validate_annotation_feature_comprehensive',
    
    # FeatureCollection validators
    'validate_bbox',
    'validate_feature_collection',
    'classify_feature',
    'validate_feature_by_type',
    'validate_feature_collection_properties',
    'get_feature_counts',
    'validate_feature_collection_comprehensive'
]