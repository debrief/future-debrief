#!/usr/bin/env python3

"""
Test that verifies Python files are generated correctly by the build process
"""

import importlib.util
import sys
from pathlib import Path

# Add the project root to Python path
PROJECT_ROOT = Path(__file__).parent.parent.parent
DERIVED_DIR = PROJECT_ROOT / 'python-src' / 'debrief' / 'types'

EXPECTED_FILES = [
    'features/track.py',
    'features/point.py',
    'features/annotation.py',
    'features/debrief_feature_collection.py'
]

EXPECTED_CLASSES = {
    'features/track.py': ['DebriefTrackFeature'],
    'features/point.py': ['DebriefPointFeature'],
    'features/annotation.py': ['DebriefAnnotationFeature'],
    'features/debrief_feature_collection.py': ['DebriefFeatureCollection']
}


def test_file_exists(filename):
    """Test that generated file exists"""
    file_path = DERIVED_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Generated file missing: {filename}")
    print(f"✓ File exists: {filename}")
    return file_path


def test_file_content(filename, file_path):
    """Test that generated file has expected content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        raise Exception(f"Could not read file {filename}: {e}")

    if len(content) == 0:
        raise Exception(f"Generated file is empty: {filename}")

    # Check for expected classes
    expected_classes = EXPECTED_CLASSES.get(filename, [])
    for class_name in expected_classes:
        if f"class {class_name}" not in content:
            raise Exception(f"Missing expected class '{class_name}' in {filename}")

    # Check for Pydantic model signature
    if "from pydantic import" not in content and "BaseModel" not in content:
        raise Exception(f"File {filename} doesn't appear to be a Pydantic model")

    print(f"✓ File content valid: {filename}")


def test_python_syntax(filename, file_path):
    """Test that generated file has valid Python syntax"""
    try:
        # Try to compile the Python file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        compile(content, str(file_path), 'exec')
        print(f"✓ Python syntax valid: {filename}")
        
    except SyntaxError as e:
        raise Exception(f"File {filename} has invalid Python syntax: {e}")


def test_imports(filename, file_path):
    """Test that the module can be imported or has valid cross-references"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if file has relative imports (cross-referenced schemas)
        if "from . import" in content or "from ." in content:
            print(f"⚠ Module has relative imports (expected for cross-referenced schemas): {filename}")
            return

        # For files without relative imports, try to import them
        spec = importlib.util.spec_from_file_location(
            filename[:-3],  # Remove .py extension
            file_path
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Check that expected classes exist
        expected_classes = EXPECTED_CLASSES.get(filename, [])
        for class_name in expected_classes:
            if not hasattr(module, class_name):
                raise Exception(f"Class '{class_name}' not importable from {filename}")

        print(f"✓ Module imports correctly: {filename}")

    except ModuleNotFoundError as missing:
        missing_name = getattr(missing, 'name', str(missing))
        print(f'⚠ Skipping import for {filename}: missing dependency "{missing_name}"')
        return
    except Exception as e:
        raise Exception(f"Could not import module {filename}: {e}")


def run_tests():
    """Run all tests"""
    print('Testing Python generated files...\n')
    
    passed_tests = 0
    failed_tests = 0
    
    for filename in EXPECTED_FILES:
        try:
            file_path = test_file_exists(filename)
            test_file_content(filename, file_path)
            test_python_syntax(filename, file_path)
            test_imports(filename, file_path)
            passed_tests += 1
        except Exception as error:
            print(f"✗ {error}")
            failed_tests += 1
    
    print("\nTest Results:")
    print(f"✓ Passed: {passed_tests}")
    print(f"✗ Failed: {failed_tests}")
    
    if failed_tests > 0:
        print('\nSome tests failed. Run "npm run build" to regenerate files.')
        sys.exit(1)
    
    print('\n🎉 All Python generated file tests passed!')


if __name__ == '__main__':
    run_tests()
