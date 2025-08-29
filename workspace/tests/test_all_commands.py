#!/usr/bin/env python3
"""
Comprehensive test for all Debrief WebSocket Bridge commands
"""

import time
import os
from debrief_api import debrief, DebriefAPIError

def create_test_geojson():
    """Create a test GeoJSON file for testing."""
    test_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "test_feature_1",
                    "name": "Test Point 1"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-74.006, 40.7128]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "id": "test_feature_2", 
                    "name": "Test Point 2"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-73.935, 40.730]
                }
            }
        ]
    }
    
    # Write test file
    import json
    with open('test_commands.plot.json', 'w') as f:
        json.dump(test_data, f, indent=2)
    
    return test_data

def run_all_command_tests():
    """Run comprehensive tests for all commands."""
    print("=" * 70)
    print("DEBRIEF WEBSOCKET BRIDGE - ALL COMMANDS TEST")
    print("=" * 70)
    
    test_results = {
        "connection": False,
        "notify": False,
        "get_feature_collection": False,
        "set_feature_collection": False,
        "get_selected_features": False,
        "set_selected_features": False,
        "add_features": False,
        "update_features": False,
        "delete_features": False,
        "zoom_to_selection": False
    }
    
    # Create test data
    print("\n📁 Creating test GeoJSON file...")
    test_data = create_test_geojson()
    
    # Test 1: Basic Connection
    print("\n1. Testing connection...")
    try:
        debrief.connect()
        print("✓ Connected to WebSocket bridge")
        test_results["connection"] = True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return test_results
    
    # Test 2: Notify Command
    print("\n2. Testing notify command...")
    try:
        debrief.notify("Starting comprehensive command tests...")
        print("✓ Notify command working")
        test_results["notify"] = True
    except Exception as e:
        print(f"✗ Notify failed: {e}")
    
    filename = "test_commands.plot.json"
    
    # Test 3: Get Feature Collection
    print("\n3. Testing get_feature_collection...")
    try:
        fc = debrief.get_feature_collection(filename)
        if fc and fc.get('type') == 'FeatureCollection':
            print(f"✓ Retrieved feature collection with {len(fc.get('features', []))} features")
            test_results["get_feature_collection"] = True
        else:
            print("✗ Invalid feature collection returned")
    except Exception as e:
        print(f"✗ get_feature_collection failed: {e}")
    
    # Test 4: Set Feature Collection
    print("\n4. Testing set_feature_collection...")
    try:
        # Modify the test data
        modified_data = test_data.copy()
        modified_data['features'].append({
            "type": "Feature",
            "properties": {
                "id": "added_by_set_fc",
                "name": "Added by set_feature_collection"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-74.0, 40.75]
            }
        })
        
        debrief.set_feature_collection(filename, modified_data)
        
        # Verify the change
        fc = debrief.get_feature_collection(filename)
        if len(fc.get('features', [])) == 3:  # Original 2 + 1 new
            print("✓ set_feature_collection working")
            test_results["set_feature_collection"] = True
        else:
            print(f"✗ Expected 3 features, got {len(fc.get('features', []))}")
    except Exception as e:
        print(f"✗ set_feature_collection failed: {e}")
    
    # Test 5: Get Selected Features
    print("\n5. Testing get_selected_features...")
    try:
        selected = debrief.get_selected_features(filename)
        print(f"✓ Retrieved {len(selected)} selected features")
        test_results["get_selected_features"] = True
    except Exception as e:
        print(f"✗ get_selected_features failed: {e}")
    
    # Test 6: Set Selected Features
    print("\n6. Testing set_selected_features...")
    try:
        debrief.set_selected_features(filename, ["test_feature_1"])
        print("✓ set_selected_features command sent")
        test_results["set_selected_features"] = True
    except Exception as e:
        print(f"✗ set_selected_features failed: {e}")
    
    # Test 7: Add Features
    print("\n7. Testing add_features...")
    try:
        new_features = [
            {
                "type": "Feature",
                "properties": {
                    "name": "Added Feature"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-74.01, 40.72]
                }
            }
        ]
        
        debrief.add_features(filename, new_features)
        
        # Verify the addition
        fc = debrief.get_feature_collection(filename)
        if len(fc.get('features', [])) == 4:  # Previous 3 + 1 new
            print("✓ add_features working")
            test_results["add_features"] = True
        else:
            print(f"✗ Expected 4 features after add, got {len(fc.get('features', []))}")
    except Exception as e:
        print(f"✗ add_features failed: {e}")
    
    # Test 8: Update Features
    print("\n8. Testing update_features...")
    try:
        # Get current features and modify one
        fc = debrief.get_feature_collection(filename)
        if fc.get('features'):
            feature_to_update = fc['features'][0].copy()
            feature_to_update['properties']['name'] = "Updated Feature Name"
            
            debrief.update_features(filename, [feature_to_update])
            
            # Verify the update
            fc_updated = get_feature_collection(filename)
            updated_feature = fc_updated['features'][0]
            if updated_feature['properties']['name'] == "Updated Feature Name":
                print("✓ update_features working")
                test_results["update_features"] = True
            else:
                print("✗ Feature was not updated correctly")
        else:
            print("✗ No features available to update")
    except Exception as e:
        print(f"✗ update_features failed: {e}")
    
    # Test 9: Delete Features
    print("\n9. Testing delete_features...")
    try:
        # Delete a specific feature by ID
        debrief.delete_features(filename, ["test_feature_2"])
        
        # Verify the deletion
        fc = debrief.get_feature_collection(filename)
        remaining_ids = [f['properties'].get('id') for f in fc.get('features', []) if f.get('properties', {}).get('id')]
        
        if "test_feature_2" not in remaining_ids:
            print("✓ delete_features working")
            test_results["delete_features"] = True
        else:
            print("✗ Feature was not deleted")
    except Exception as e:
        print(f"✗ delete_features failed: {e}")
    
    # Test 10: Zoom to Selection
    print("\n10. Testing zoom_to_selection...")
    try:
        debrief.zoom_to_selection(filename)
        print("✓ zoom_to_selection command sent")
        test_results["zoom_to_selection"] = True
    except Exception as e:
        print(f"✗ zoom_to_selection failed: {e}")
    
    # Cleanup
    try:
        os.remove('test_commands.plot.json')
        print("\n🧹 Test file cleaned up")
    except:
        pass
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST RESULTS SUMMARY")
    print("=" * 70)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, passed in test_results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name.replace('_', ' ').title():<30} {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL COMMANDS WORKING! Debrief WebSocket Bridge is fully functional.")
        try:
            debrief.notify("All WebSocket Bridge Commands Tested Successfully! ✅")
        except:
            pass
    else:
        print(f"\n⚠️  {total_tests - passed_tests} command(s) failed. Please check the implementation.")
    
    print("=" * 70)
    return test_results

if __name__ == "__main__":
    run_all_command_tests()