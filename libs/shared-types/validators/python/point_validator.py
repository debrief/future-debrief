"""
Manual validators for Point features
These validators work with the generated types and provide additional validation logic
"""

from typing import Any, Dict, List, Union, Optional
from datetime import datetime
import sys
import os

# Add the derived module to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'derived', 'python'))

try:
    from point import PointFeature
except ImportError:
    # If import fails, define a minimal type for validation
    class PointFeature:
        pass


def validate_time_properties(feature: Dict[str, Any]) -> bool:
    """
    Validates that point has valid time properties
    Either single time OR time range (start/end) should be provided, not both
    """
    properties = feature.get('properties', {})
    time = properties.get('time')
    time_start = properties.get('timeStart')
    time_end = properties.get('timeEnd')
    
    # Either single time OR time range (start/end) should be provided, not both
    if time and (time_start or time_end):
        return False  # Cannot have both single time and time range
    
    # If time range is provided, both start and end should be present
    if (time_start and not time_end) or (not time_start and time_end):
        return False  # Time range requires both start and end
    
    # If timeStart and timeEnd are provided, start should be before end
    if time_start and time_end:
        try:
            if isinstance(time_start, str):
                start_dt = datetime.fromisoformat(time_start.replace('Z', '+00:00'))
            else:
                start_dt = time_start
                
            if isinstance(time_end, str):
                end_dt = datetime.fromisoformat(time_end.replace('Z', '+00:00'))
            else:
                end_dt = time_end
                
            if start_dt >= end_dt:
                return False  # Start time must be before end time
        except (ValueError, TypeError):
            return False
    
    return True


def validate_point_feature(feature: Any) -> bool:
    """
    Validates that point feature has required properties and valid structure
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
    
    if geometry.get('type') != 'Point':
        return False
    
    coordinates = geometry.get('coordinates')
    if not isinstance(coordinates, list):
        return False
    
    # Validate coordinates [lon, lat] or [lon, lat, elevation]
    if len(coordinates) < 2 or len(coordinates) > 3:
        return False
    
    if not all(isinstance(coord, (int, float)) for coord in coordinates):
        return False
    
    # Check properties
    properties = feature.get('properties')
    if not isinstance(properties, dict):
        return False
    
    # Validate time properties if present
    return validate_time_properties(feature)


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


def validate_geographic_coordinates(coordinates: List[float]) -> bool:
    """
    Validates coordinate values are within valid geographic ranges
    """
    if len(coordinates) < 2:
        return False
    
    lon, lat = coordinates[0], coordinates[1]
    
    # Longitude: -180 to 180
    if lon < -180 or lon > 180:
        return False
    
    # Latitude: -90 to 90
    if lat < -90 or lat > 90:
        return False
    
    # Elevation is optional, but if present should be reasonable
    if len(coordinates) > 2:
        elevation = coordinates[2]
        # Allow elevation from -11000m (deepest ocean) to 9000m (highest mountains)
        if elevation < -11000 or elevation > 9000:
            return False
    
    return True


def validate_point_feature_comprehensive(feature: Any) -> Dict[str, Union[bool, List[str]]]:
    """
    Comprehensive point feature validation
    """
    errors = []
    
    # Basic validation
    if not validate_point_feature(feature):
        errors.append('Invalid point feature structure')
        return {'is_valid': False, 'errors': errors}
    
    # Geographic coordinate validation
    geometry = feature.get('geometry', {})
    coordinates = geometry.get('coordinates', [])
    if not validate_geographic_coordinates(coordinates):
        errors.append('Coordinates are outside valid geographic ranges')
    
    # Time property validation
    if not validate_time_properties(feature):
        errors.append('Invalid time properties configuration')
    
    # Individual date validation
    properties = feature.get('properties', {})
    time = properties.get('time')
    time_start = properties.get('timeStart')
    time_end = properties.get('timeEnd')
    
    if time and not is_valid_date(time):
        errors.append('Invalid time format')
    if time_start and not is_valid_date(time_start):
        errors.append('Invalid timeStart format')
    if time_end and not is_valid_date(time_end):
        errors.append('Invalid timeEnd format')
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors
    }