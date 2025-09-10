"""
Manual validators for Annotation features  
These validators work with the generated types and provide additional validation logic
"""

from typing import Any, Dict, List, Union, Optional
from datetime import datetime
import re
import sys
import os

# Add the derived module to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'derived', 'python'))

try:
    from annotation import AnnotationFeature
except ImportError:
    # If import fails, define a minimal type for validation
    class AnnotationFeature:
        pass


def validate_color_format(color: str) -> bool:
    """
    Validates color format (hex color)
    """
    hex_color_regex = r'^#[0-9a-fA-F]{6}$'
    return re.match(hex_color_regex, color) is not None


def validate_annotation_type(annotation_type: str) -> bool:
    """
    Validates annotation type
    """
    valid_types = ['label', 'area', 'measurement', 'comment', 'boundary']
    return annotation_type in valid_types


def validate_annotation_feature(feature: Any) -> bool:
    """
    Validates that annotation feature has required properties and valid structure
    """
    if not isinstance(feature, dict):
        return False
    
    # Check basic GeoJSON structure
    if feature.get('type') != 'Feature':
        return False
    
    feature_id = feature.get('id')
    if feature_id is None:
        return False  # id is required
    
    # Check geometry
    geometry = feature.get('geometry')
    if not isinstance(geometry, dict):
        return False
    
    valid_geometry_types = [
        'Point', 'LineString', 'Polygon',
        'MultiPoint', 'MultiLineString', 'MultiPolygon'
    ]
    if geometry.get('type') not in valid_geometry_types:
        return False
    
    coordinates = geometry.get('coordinates')
    if not isinstance(coordinates, list):
        return False
    
    # Check properties
    properties = feature.get('properties')
    if not isinstance(properties, dict):
        return False
    
    # Validate specific annotation properties
    annotation_type = properties.get('annotationType')
    if annotation_type and not validate_annotation_type(annotation_type):
        return False
    
    color = properties.get('color')
    if color and not validate_color_format(color):
        return False
    
    return True


def validate_point_coordinates(coordinates: Any) -> bool:
    """
    Validates Point geometry coordinates
    """
    return (isinstance(coordinates, list) and
            len(coordinates) >= 2 and
            len(coordinates) <= 3 and
            all(isinstance(coord, (int, float)) for coord in coordinates))


def validate_linestring_coordinates(coordinates: Any) -> bool:
    """
    Validates LineString geometry coordinates
    """
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return False
    return all(validate_point_coordinates(coord) for coord in coordinates)


def validate_polygon_coordinates(coordinates: Any) -> bool:
    """
    Validates Polygon geometry coordinates
    """
    if not isinstance(coordinates, list) or len(coordinates) < 1:
        return False
    
    # Each ring must be a closed LineString (first and last points equal)
    for ring in coordinates:
        if not isinstance(ring, list) or len(ring) < 4:
            return False  # Polygon ring must have at least 4 points (closed)
        
        # Check all coordinates are valid
        if not all(validate_point_coordinates(coord) for coord in ring):
            return False
        
        # Check if ring is closed (first and last points are equal)
        first = ring[0]
        last = ring[-1]
        if len(first) != len(last) or not all(f == l for f, l in zip(first, last)):
            return False
    
    return True


def validate_multipoint_coordinates(coordinates: Any) -> bool:
    """
    Validates MultiPoint geometry coordinates
    """
    return (isinstance(coordinates, list) and
            all(validate_point_coordinates(coord) for coord in coordinates))


def validate_multilinestring_coordinates(coordinates: Any) -> bool:
    """
    Validates MultiLineString geometry coordinates
    """
    return (isinstance(coordinates, list) and
            all(validate_linestring_coordinates(line_string) for line_string in coordinates))


def validate_multipolygon_coordinates(coordinates: Any) -> bool:
    """
    Validates MultiPolygon geometry coordinates
    """
    return (isinstance(coordinates, list) and
            all(validate_polygon_coordinates(polygon) for polygon in coordinates))


def validate_geometry_coordinates(geometry: Dict[str, Any]) -> bool:
    """
    Validates geometry coordinates based on type
    """
    geometry_type = geometry.get('type')
    coordinates = geometry.get('coordinates')
    
    validators = {
        'Point': validate_point_coordinates,
        'LineString': validate_linestring_coordinates,
        'Polygon': validate_polygon_coordinates,
        'MultiPoint': validate_multipoint_coordinates,
        'MultiLineString': validate_multilinestring_coordinates,
        'MultiPolygon': validate_multipolygon_coordinates
    }
    
    validator = validators.get(geometry_type)
    if not validator:
        return False
    
    return validator(coordinates)


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


def validate_annotation_feature_comprehensive(feature: Any) -> Dict[str, Union[bool, List[str]]]:
    """
    Comprehensive annotation feature validation
    """
    errors = []
    
    # Basic validation
    if not validate_annotation_feature(feature):
        errors.append('Invalid annotation feature structure')
        return {'is_valid': False, 'errors': errors}
    
    # Detailed geometry validation
    geometry = feature.get('geometry', {})
    if not validate_geometry_coordinates(geometry):
        errors.append('Invalid geometry coordinates')
    
    properties = feature.get('properties', {})
    
    # Color validation
    color = properties.get('color')
    if color and not validate_color_format(color):
        errors.append('Invalid color format (must be #RRGGBB)')
    
    # Annotation type validation
    annotation_type = properties.get('annotationType')
    if annotation_type and not validate_annotation_type(annotation_type):
        errors.append('Invalid annotation type')
    
    # Time validation
    time = properties.get('time')
    if time and not is_valid_date(time):
        errors.append('Invalid time format')
    
    # Text validation for certain annotation types
    text = properties.get('text', '')
    if annotation_type == 'label' and (not text or not text.strip()):
        errors.append('Label annotations must have non-empty text')
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors
    }