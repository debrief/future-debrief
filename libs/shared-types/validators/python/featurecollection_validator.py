"""
Manual validators for FeatureCollection
These validators work with the generated types and provide additional validation logic
"""

from typing import Any, Dict, List, Union, Optional, Tuple
from datetime import datetime
import sys
import os

# Add the derived module to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'derived', 'python'))

# Import validator functions from other modules
try:
    from .track_validator import validate_track_feature
    from .point_validator import validate_point_feature  
    from .annotation_validator import validate_annotation_feature
except ImportError:
    # Handle relative import issues during testing
    import track_validator
    import point_validator
    import annotation_validator
    validate_track_feature = track_validator.validate_track_feature
    validate_point_feature = point_validator.validate_point_feature
    validate_annotation_feature = annotation_validator.validate_annotation_feature

try:
    from featurecollection import DebriefFeatureCollection
except ImportError:
    # If import fails, define a minimal type for validation
    class DebriefFeatureCollection:
        pass


def validate_bbox(bbox: List[float]) -> bool:
    """
    Validates bounding box format
    """
    # Must be either 2D bbox [minX, minY, maxX, maxY] or 3D bbox [minX, minY, minZ, maxX, maxY, maxZ]
    if len(bbox) not in [4, 6]:
        return False
    
    # Check all values are numbers and finite
    if not all(isinstance(val, (int, float)) and not (val != val or val == float('inf') or val == float('-inf')) for val in bbox):
        return False
    
    # For 2D bbox: minX <= maxX and minY <= maxY
    if len(bbox) == 4:
        min_x, min_y, max_x, max_y = bbox
        return min_x <= max_x and min_y <= max_y
    
    # For 3D bbox: minX <= maxX, minY <= maxY, minZ <= maxZ
    if len(bbox) == 6:
        min_x, min_y, min_z, max_x, max_y, max_z = bbox
        return min_x <= max_x and min_y <= max_y and min_z <= max_z
    
    return False


def validate_feature_collection(collection: Any) -> bool:
    """
    Validates that feature collection has required properties and valid structure
    """
    if not isinstance(collection, dict):
        return False
    
    # Check basic GeoJSON FeatureCollection structure
    if collection.get('type') != 'FeatureCollection':
        return False
    
    features = collection.get('features')
    if not isinstance(features, list):
        return False
    
    # Validate bbox if present
    bbox = collection.get('bbox')
    if bbox is not None and not validate_bbox(bbox):
        return False
    
    # Validate each feature has required id property
    for feature in features:
        feature_id = feature.get('id')
        if feature_id is None:
            return False  # id is required for all features
    
    return True


def classify_feature(feature: Dict[str, Any]) -> str:
    """
    Determines the type of feature based on geometry and properties
    """
    if not isinstance(feature, dict) or 'geometry' not in feature:
        return 'unknown'
    
    geometry = feature.get('geometry', {})
    geometry_type = geometry.get('type')
    properties = feature.get('properties', {})
    
    # Track features: LineString or MultiLineString with optional timestamps
    if geometry_type in ['LineString', 'MultiLineString']:
        # If it has annotationType, it's an annotation, not a track
        if properties.get('annotationType'):
            return 'annotation'
        return 'track'
    
    # Point features: Point geometry without annotationType
    if geometry_type == 'Point':
        if properties.get('annotationType'):
            return 'annotation'
        return 'point'
    
    # All other geometries are annotations
    if geometry_type in ['Polygon', 'MultiPoint', 'MultiPolygon']:
        return 'annotation'
    
    return 'unknown'


def validate_feature_by_type(feature: Any) -> bool:
    """
    Validates individual feature based on its type
    """
    feature_type = classify_feature(feature)
    
    if feature_type == 'track':
        return validate_track_feature(feature)
    elif feature_type == 'point':
        return validate_point_feature(feature)
    elif feature_type == 'annotation':
        return validate_annotation_feature(feature)
    else:
        return False


def is_valid_date(date_value: Any) -> bool:
    """
    Validates that date string or datetime object is valid
    """
    if isinstance(date_value, datetime):
        return True
    
    if isinstance(date_value, str):
        try:
            datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            return 'T' in date_value  # Expect ISO format
        except ValueError:
            return False
    
    return False


def validate_feature_collection_properties(properties: Any) -> bool:
    """
    Validates feature collection properties
    """
    if not properties or not isinstance(properties, dict):
        return True  # properties are optional
    
    # Validate time properties if present
    created = properties.get('created')
    if created and not is_valid_date(created):
        return False
    
    modified = properties.get('modified')
    if modified and not is_valid_date(modified):
        return False
    
    # If both created and modified are present, created should be <= modified
    if created and modified:
        try:
            if isinstance(created, str):
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            else:
                created_dt = created
                
            if isinstance(modified, str):
                modified_dt = datetime.fromisoformat(modified.replace('Z', '+00:00'))
            else:
                modified_dt = modified
                
            if created_dt > modified_dt:
                return False
        except (ValueError, TypeError):
            return False
    
    return True


def get_feature_counts(collection: Dict[str, Any]) -> Dict[str, int]:
    """
    Gets feature counts by type
    """
    features = collection.get('features', [])
    counts = {
        'tracks': 0,
        'points': 0,
        'annotations': 0,
        'unknown': 0,
        'total': len(features)
    }
    
    for feature in features:
        feature_type = classify_feature(feature)
        if feature_type in counts:
            counts[feature_type + 's'] += 1
        else:
            counts['unknown'] += 1
    
    return counts


def validate_feature_collection_comprehensive(collection: Any) -> Dict[str, Union[bool, List[str], Dict[str, int]]]:
    """
    Comprehensive feature collection validation
    """
    errors = []
    
    # Basic validation
    if not validate_feature_collection(collection):
        errors.append('Invalid feature collection structure')
        return {'is_valid': False, 'errors': errors}
    
    # Properties validation
    properties = collection.get('properties')
    if not validate_feature_collection_properties(properties):
        errors.append('Invalid feature collection properties')
    
    # Validate bbox if present
    bbox = collection.get('bbox')
    if bbox and not validate_bbox(bbox):
        errors.append('Invalid bounding box format')
    
    # Validate each feature
    features = collection.get('features', [])
    for index, feature in enumerate(features):
        if not validate_feature_by_type(feature):
            errors.append(f'Feature at index {index} is invalid')
    
    # Get feature counts for analysis
    feature_counts = get_feature_counts(collection) if len(errors) == 0 else None
    
    result = {
        'is_valid': len(errors) == 0,
        'errors': errors
    }
    
    if feature_counts:
        result['feature_counts'] = feature_counts
    
    return result