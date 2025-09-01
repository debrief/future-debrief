#!/usr/bin/env python3

"""
Test that validates Python validators work correctly
"""

import os
import sys
import importlib.util
from pathlib import Path

# Add the project root to Python path
PROJECT_ROOT = Path(__file__).parent.parent.parent
VALIDATORS_DIR = PROJECT_ROOT / 'validators' / 'python'

# Add validators to path
sys.path.insert(0, str(VALIDATORS_DIR))

VALIDATOR_FILES = [
    'track_validator.py',
    'point_validator.py', 
    'annotation_validator.py',
    'featurecollection_validator.py',
    '__init__.py'
]

EXPECTED_FUNCTIONS = {
    'track_validator.py': [
        'validate_timestamps_length',
        'validate_track_feature',
        'validate_track_feature_comprehensive'
    ],
    'point_validator.py': [
        'validate_time_properties',
        'validate_point_feature',
        'validate_point_feature_comprehensive'
    ],
    'annotation_validator.py': [
        'validate_color_format',
        'validate_annotation_type',
        'validate_annotation_feature',
        'validate_annotation_feature_comprehensive'
    ],
    'featurecollection_validator.py': [
        'validate_bbox',
        'validate_feature_collection',
        'validate_feature_collection_comprehensive'
    ]
}

# Test data for validators
TEST_DATA = {
    'track': {
        'valid': {
            'type': 'Feature',
            'id': 'track-1',
            'geometry': {
                'type': 'LineString',
                'coordinates': [
                    [-1.0, 51.0],
                    [-0.9, 51.1],
                    [-0.8, 51.2]
                ]
            },
            'properties': {
                'timestamps': [
                    '2024-01-01T10:00:00Z',
                    '2024-01-01T10:01:00Z',
                    '2024-01-01T10:02:00Z'
                ],
                'name': 'Test Track'
            }
        },
        'invalid_timestamps': {
            'type': 'Feature',
            'id': 'track-1',
            'geometry': {
                'type': 'LineString',
                'coordinates': [[-1.0, 51.0], [-0.9, 51.1], [-0.8, 51.2]]  # 3 coords
            },
            'properties': {
                'timestamps': ['2024-01-01T10:00:00Z', '2024-01-01T10:01:00Z']  # 2 timestamps
            }
        },
        'invalid': {
            'type': 'Feature',
            'id': 'track-1',
            'geometry': {
                'type': 'LineString',
                'coordinates': [[-1.0, 51.0], [-0.9, 51.1]]
            },
            'properties': {
                'timestamps': ['2024-01-01T10:00:00Z']  # Wrong length
            }
        }
    },
    'point': {
        'valid': {
            'type': 'Feature',
            'id': 'point-1', 
            'geometry': {
                'type': 'Point',
                'coordinates': [-1.0, 51.0]
            },
            'properties': {
                'time': '2024-01-01T10:00:00Z',
                'name': 'Test Point'
            }
        },
        'invalid': {
            'type': 'Feature',
            'id': 'point-1',
            'geometry': {
                'type': 'Point',
                'coordinates': [-1.0, 51.0]
            },
            'properties': {
                'time': '2024-01-01T10:00:00Z',
                'timeStart': '2024-01-01T09:00:00Z'  # Both time and timeStart
            }
        }
    }
}


def test_validator_file_exists(filename):
    """Test that validator file exists"""
    file_path = VALIDATORS_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Validator file missing: {filename}")
    print(f"✓ Validator file exists: {filename}")
    return file_path


def test_validator_imports(filename, file_path):
    """Test that validator module can be imported"""
    try:
        module_name = filename[:-3]  # Remove .py extension
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Check that expected functions exist
        expected_functions = EXPECTED_FUNCTIONS.get(filename, [])
        for func_name in expected_functions:
            if not hasattr(module, func_name):
                raise Exception(f"Function '{func_name}' not found in {filename}")
        
        print(f"✓ Validator imports correctly: {filename}")
        return module
        
    except Exception as e:
        raise Exception(f"Could not import validator {filename}: {e}")


def test_validator_functions(module_name, module):
    """Test that validator functions work correctly"""
    # Test track validator
    if module_name == 'track_validator':
        test_data = TEST_DATA['track']
        
        # Test valid data
        result = module.validate_track_feature(test_data['valid'])
        if not result:
            raise Exception("Track validator should accept valid track data")
        
        # Test invalid data (timestamps length mismatch)
        result = module.validate_track_feature(test_data['invalid'])
        if result:
            raise Exception("Track validator should reject invalid track data")
            
        # Test timestamps length validation specifically
        result = module.validate_timestamps_length(test_data['invalid'])
        if result:
            raise Exception("Timestamps length validation should fail for mismatched lengths")
        
        print("✓ Track validator functions work correctly")
        
    # Test point validator
    elif module_name == 'point_validator':
        test_data = TEST_DATA['point']
        
        # Test valid data
        result = module.validate_point_feature(test_data['valid'])
        if not result:
            raise Exception("Point validator should accept valid point data")
        
        # Test invalid data (both time and timeStart)
        result = module.validate_point_feature(test_data['invalid'])
        if result:
            raise Exception("Point validator should reject point with both time and timeStart")
        
        # Test time properties validation specifically
        result = module.validate_time_properties(test_data['invalid'])
        if result:
            raise Exception("Time properties validation should fail for conflicting time fields")
        
        print("✓ Point validator functions work correctly")
        
    # Test annotation validator
    elif module_name == 'annotation_validator':
        # Test color format validation
        if not module.validate_color_format('#FF0000'):
            raise Exception("Color validator should accept valid hex color")
        
        if module.validate_color_format('red'):
            raise Exception("Color validator should reject invalid color format")
        
        # Test annotation type validation
        if not module.validate_annotation_type('label'):
            raise Exception("Annotation type validator should accept valid type")
        
        if module.validate_annotation_type('invalid'):
            raise Exception("Annotation type validator should reject invalid type")
        
        print("✓ Annotation validator functions work correctly")
        
    # Test featurecollection validator
    elif module_name == 'featurecollection_validator':
        # Test bbox validation
        if not module.validate_bbox([-1.0, 50.0, 1.0, 52.0]):
            raise Exception("Bbox validator should accept valid 2D bbox")
        
        if module.validate_bbox([1.0, 50.0, -1.0, 52.0]):  # minX > maxX
            raise Exception("Bbox validator should reject invalid bbox")
        
        print("✓ FeatureCollection validator functions work correctly")


def test_comprehensive_validators():
    """Test comprehensive validator functions"""
    try:
        import track_validator
        
        test_data = TEST_DATA['track']
        
        # Test comprehensive validation
        result = track_validator.validate_track_feature_comprehensive(test_data['valid'])
        if not result['is_valid']:
            raise Exception(f"Comprehensive validator failed for valid data: {result['errors']}")
        
        # Test with data that has valid structure but timestamp mismatch
        result = track_validator.validate_track_feature_comprehensive(test_data['invalid_timestamps'])
        if result['is_valid']:
            raise Exception("Comprehensive validator should fail for timestamps mismatch")
        
        error_text = ' '.join(result['errors']).lower()
        if 'timestamps' not in error_text and 'coordinate' not in error_text:
            raise Exception(f"Comprehensive validator should report timestamps/coordinate error, got: {result['errors']}")
        
        print("✓ Comprehensive validators work correctly")
        
    except ImportError as e:
        raise Exception(f"Could not import validator for comprehensive testing: {e}")


def test_cross_field_validation():
    """Test that critical cross-field validation is implemented"""
    try:
        import track_validator
        
        # Test the key validation: timestamps length must match coordinates
        feature_with_mismatch = {
            'type': 'Feature',
            'id': 'test',
            'geometry': {
                'type': 'LineString',
                'coordinates': [[-1.0, 51.0], [-0.9, 51.1], [-0.8, 51.2]]  # 3 points
            },
            'properties': {
                'timestamps': ['2024-01-01T10:00:00Z', '2024-01-01T10:01:00Z']  # 2 timestamps
            }
        }
        
        result = track_validator.validate_timestamps_length(feature_with_mismatch)
        if result:
            raise Exception("Cross-field validation should catch timestamps/coordinates mismatch")
        
        print("✓ Cross-field validation implemented correctly")
        
    except ImportError as e:
        raise Exception(f"Could not import validator for cross-field testing: {e}")


def run_tests():
    """Run all validator tests"""
    print('Testing Python validators...\n')
    
    passed_tests = 0
    failed_tests = 0
    
    # Test individual validator files
    modules = {}
    for filename in VALIDATOR_FILES:
        try:
            file_path = test_validator_file_exists(filename)
            if filename.endswith('.py') and filename != '__init__.py':
                module = test_validator_imports(filename, file_path)
                modules[filename[:-3]] = module  # Store without .py extension
            passed_tests += 1
        except Exception as error:
            print(f"✗ {error}")
            failed_tests += 1
    
    # Test validator function behavior
    for module_name, module in modules.items():
        try:
            test_validator_functions(module_name, module)
            passed_tests += 1
        except Exception as error:
            print(f"✗ {error}")
            failed_tests += 1
    
    # Test comprehensive and cross-field validation
    try:
        test_comprehensive_validators()
        passed_tests += 1
    except Exception as error:
        print(f"✗ {error}")
        failed_tests += 1
        
    try:
        test_cross_field_validation()
        passed_tests += 1
    except Exception as error:
        print(f"✗ {error}")
        failed_tests += 1
    
    print(f"\nTest Results:")
    print(f"✓ Passed: {passed_tests}")
    print(f"✗ Failed: {failed_tests}")
    
    if failed_tests > 0:
        print('\nSome validator tests failed.')
        sys.exit(1)
    
    print('\n🎉 All Python validator tests passed!')


if __name__ == '__main__':
    run_tests()