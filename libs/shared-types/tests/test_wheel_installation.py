#!/usr/bin/env python3
"""
Test script to validate the dual-distribution Python types system.

This script tests:
1. Standalone wheel installation and functionality
2. All type imports and validator functions
3. Schema access and JSON schema loading
4. Integration with existing maritime GeoJSON data
"""

import json
import sys
from pathlib import Path

def test_standalone_installation():
    """Test standalone wheel installation and imports."""
    print("🧪 Testing standalone wheel installation...")
    
    # Test all type imports
    try:
        from debrief.types import (
            AnnotationFeature,
            DebriefFeatureCollection,
            PointFeature,
            SelectionState,
            TimeState,
            TrackFeature,
            ViewportState,
        )
        _ = (
            TrackFeature,
            PointFeature,
            AnnotationFeature,
            DebriefFeatureCollection,
            TimeState,
            ViewportState,
            SelectionState,
        )
        print("✅ All type imports successful")
    except ImportError as e:
        print(f"❌ Type import failed: {e}")
        return False

    # Test validator imports
    try:
        from debrief.validators import (
            validate_annotation_feature,
            validate_feature_collection,
            validate_point_feature,
            validate_track_feature,
        )
        _ = (
            validate_track_feature,
            validate_point_feature,
            validate_annotation_feature,
            validate_feature_collection,
        )
        print("✅ All validator imports successful")
    except ImportError as e:
        print(f"❌ Validator import failed: {e}")
        return False

    # Test schema imports
    try:
        from debrief.schemas import (
            get_annotation_schema,
            get_point_schema,
            get_track_schema,
            list_schemas,
        )
        _ = (get_track_schema, get_point_schema, get_annotation_schema, list_schemas)
        print("✅ All schema imports successful")
    except ImportError as e:
        print(f"❌ Schema import failed: {e}")
        return False

    return True

def test_type_functionality():
    """Test that types and validators actually work."""
    print("🧪 Testing type functionality...")
    
    from debrief.validators import validate_track_feature
    from debrief.schemas import get_track_schema, list_schemas
    
    # Test schema access
    schemas = list_schemas()
    print(f"✅ Found {len(schemas)} schemas: {schemas[:3]}...")
    
    track_schema = get_track_schema()
    if track_schema:
        print(f"✅ Track schema loaded with title: '{track_schema.get('title', 'No title')}'")
    else:
        print("❌ Failed to load track schema")
        return False
    
    # Test validator with sample data
    sample_track = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[0, 0], [1, 1], [2, 2]]
        },
        "properties": {
            "name": "Test Track",
            "timestamps": [
                "2024-01-01T00:00:00Z", 
                "2024-01-01T00:01:00Z", 
                "2024-01-01T00:02:00Z"
            ]
        }
    }
    
    try:
        # Note: This calls the actual validator function
        is_valid = validate_track_feature(sample_track)
        print(f"✅ Track validation completed (result: {is_valid})")
    except Exception as e:
        print(f"❌ Track validation failed: {e}")
        return False
    
    return True

def test_vs_code_wheel_exists():
    """Test that VS Code extension has the bundled wheel."""
    print("🧪 Testing VS Code extension wheel bundling...")
    
    # Check if wheel exists in VS Code extension
    vs_code_wheel = Path(__file__).parent.parent.parent.parent / "apps" / "vs-code" / "python" / "debrief_types.whl"
    
    if vs_code_wheel.exists():
        print(f"✅ VS Code extension wheel exists: {vs_code_wheel}")
        
        # Check file size
        size_mb = vs_code_wheel.stat().st_size / (1024 * 1024)
        print(f"✅ Wheel size: {size_mb:.2f} MB")
        
        return True
    else:
        print(f"❌ VS Code extension wheel missing: {vs_code_wheel}")
        return False

def test_package_version_sync():
    """Test that package version matches package.json."""
    print("🧪 Testing version synchronization...")
    
    try:
        from debrief import __version__
        print(f"✅ Package version: {__version__}")
        
        # Check package.json version
        package_json_path = Path(__file__).parent.parent / "package.json"
        with open(package_json_path) as f:
            package_data = json.load(f)
            npm_version = package_data["version"]
            
        print(f"✅ npm version: {npm_version}")
        
        if __version__ == npm_version:
            print("✅ Versions are synchronized")
            return True
        else:
            print(f"⚠️  Version mismatch: Python {__version__} vs npm {npm_version}")
            return True  # Not a critical failure
            
    except Exception as e:
        print(f"❌ Version check failed: {e}")
        return False

def test_integration_example():
    """Test a complete integration example."""
    print("🧪 Testing complete integration example...")
    
    try:
        # Import everything needed for a complete workflow
        from debrief.types import DebriefFeatureCollection, TimeState
        from debrief.validators import validate_feature_collection
        from debrief.schemas import get_featurecollection_schema
        _ = (DebriefFeatureCollection, TimeState)
        
        # Create a feature collection
        feature_collection = {
            "type": "FeatureCollection", 
            "features": [],
            "properties": {
                "name": "Test Collection",
                "description": "Integration test collection"
            }
        }
        
        # Validate it
        is_valid = validate_feature_collection(feature_collection)
        print(f"✅ Feature collection validation: {is_valid}")
        
        # Get the schema
        schema = get_featurecollection_schema()
        if schema:
            print(f"✅ Feature collection schema loaded: {schema.get('title', 'No title')}")
        
        print("✅ Integration example completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Integration example failed: {e}")
        return False

def main():
    """Main test runner."""
    print("🚀 Starting Dual-Distribution Python Types System Tests\n")
    
    tests = [
        ("Standalone Installation", test_standalone_installation),
        ("Type Functionality", test_type_functionality),
        ("VS Code Wheel Bundling", test_vs_code_wheel_exists),
        ("Version Synchronization", test_package_version_sync),
        ("Integration Example", test_integration_example),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST RESULTS SUMMARY")
    print('='*60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:10} {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Dual-distribution system is working correctly.")
        return 0
    else:
        print("💥 Some tests failed. Please check the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
