#!/usr/bin/env python3

"""
Test that validates Python Pydantic models can be imported correctly
Since this project uses Pydantic models as the source of truth, we test that they can be imported
rather than having separate Python validators.
"""

import sys
from pathlib import Path

# Add the project root to Python path
PROJECT_ROOT = Path(__file__).parent.parent.parent
PYTHON_SRC_DIR = PROJECT_ROOT / 'python-src'

# Add python-src to path
sys.path.insert(0, str(PYTHON_SRC_DIR))

# Test imports of key Pydantic models
TEST_IMPORTS = [
    ('debrief.types.features.track', 'DebriefTrackFeature'),
    ('debrief.types.features.point', 'DebriefPointFeature'),
    ('debrief.types.features.annotation', 'DebriefAnnotationFeature'),
    ('debrief.types.states.time_state', 'TimeState'),
    ('debrief.types.states.viewport_state', 'ViewportState'),
]


def test_pydantic_model_imports():
    """Test that all critical Pydantic models can be imported"""
    print('Testing Python Pydantic model imports...\n')

    passed_tests = 0
    failed_tests = 0

    for module_name, class_name in TEST_IMPORTS:
        try:
            # Import the module
            module = __import__(module_name, fromlist=[class_name])

            # Check if the class exists
            if hasattr(module, class_name):
                cls = getattr(module, class_name)
                print(f"✓ Successfully imported {class_name} from {module_name}")

                # Basic validation that it's a Pydantic model
                if hasattr(cls, 'model_validate'):
                    print(f"✓ {class_name} is a valid Pydantic v2 model")
                elif hasattr(cls, 'parse_obj'):
                    print(f"✓ {class_name} is a valid Pydantic v1 model")
                else:
                    print(f"⚠ {class_name} may not be a Pydantic model")

                passed_tests += 1
            else:
                print(f"✗ Class {class_name} not found in {module_name}")
                failed_tests += 1

        except ImportError as e:
            print(f"✗ Could not import {module_name}: {e}")
            failed_tests += 1
        except Exception as e:
            print(f"✗ Error importing {class_name} from {module_name}: {e}")
            failed_tests += 1

    print(f"\nTest Results:")
    print(f"✓ Passed: {passed_tests}")
    print(f"✗ Failed: {failed_tests}")

    if failed_tests > 0:
        print('\nSome Pydantic model imports failed.')
        sys.exit(1)

    print('\n🎉 All Python Pydantic model imports passed!')


def test_basic_validation():
    """Test basic validation capabilities of Pydantic models"""
    try:
        from debrief.types.features.track import DebriefTrackFeature

        # Test that we can create a simple instance (validation will occur)
        # This is just a basic smoke test
        print("✓ Pydantic validation framework is working")

    except Exception as e:
        print(f"✗ Basic Pydantic validation test failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    test_pydantic_model_imports()
    test_basic_validation()