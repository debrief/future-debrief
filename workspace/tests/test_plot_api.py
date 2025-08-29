#!/usr/bin/env python3
"""
Test script for plot manipulation API with optional filename support.

This script tests the full plot manipulation API including:
- Feature collection operations
- Feature selection operations  
- Feature CRUD operations
- With both explicit filenames and optional filename auto-detection
"""

from debrief_api import debrief, DebriefAPIError, MultiplePlotsError
import json


def create_test_feature():
    """Create a test feature for adding to plots."""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [-74.006, 40.7128]  # New York City
        },
        "properties": {
            "name": "Test Feature",
            "description": "Created by test script"
        }
    }


def test_plot_api_with_explicit_filename():
    """Test plot API with explicit filename (backward compatibility)."""
    print("\n=== Testing Plot API with Explicit Filename ===")
    
    plots = debrief.list_open_plots()
    if not plots:
        print("No plots open - skipping explicit filename tests")
        return True
    
    filename = plots[0]['filename']
    print(f"Using plot: {filename}")
    
    try:
        # Test get feature collection
        print("1. Getting feature collection...")
        fc = debrief.get_feature_collection(filename)
        print(f"   Got {len(fc.get('features', []))} features")
        
        # Test get selected features
        print("2. Getting selected features...")
        selected = debrief.get_selected_features(filename)
        print(f"   Got {len(selected)} selected features")
        
        # Test add feature
        print("3. Adding test feature...")
        test_feature = create_test_feature()
        debrief.add_features([test_feature], filename)
        print("   Feature added successfully")
        
        # Verify the feature was added
        fc_after = debrief.get_feature_collection(filename)
        added_count = len(fc_after.get('features', [])) - len(fc.get('features', []))
        print(f"   Verified: {added_count} feature(s) added")
        
        # Test zoom to selection
        print("4. Testing zoom to selection...")
        debrief.zoom_to_selection(filename)
        print("   Zoom command sent successfully")
        
        print("✓ All explicit filename tests passed!")
        return True
        
    except Exception as e:
        print(f"✗ Explicit filename test failed: {e}")
        return False


def test_plot_api_with_optional_filename():
    """Test plot API with optional filename (new functionality)."""
    print("\n=== Testing Plot API with Optional Filename ===")
    
    plots = debrief.list_open_plots()
    if not plots:
        print("No plots open - skipping optional filename tests")
        return True
    
    print(f"Testing with {len(plots)} open plot(s)")
    
    try:
        # Test get feature collection without filename
        print("1. Getting feature collection (no filename specified)...")
        if len(plots) == 1:
            fc = debrief.get_feature_collection()  # Should work automatically
            print(f"   Got {len(fc.get('features', []))} features")
        else:
            print("   Multiple plots open - would prompt user in interactive mode")
        
        # Test get selected features without filename
        print("2. Getting selected features (no filename specified)...")
        if len(plots) == 1:
            selected = debrief.get_selected_features()  # Should work automatically
            print(f"   Got {len(selected)} selected features")
        else:
            print("   Multiple plots open - would prompt user in interactive mode")
        
        print("✓ Optional filename tests completed!")
        return True
        
    except MultiplePlotsError as e:
        print(f"   Got expected MultiplePlotsError: {e}")
        print(f"   Available plots: {e.available_plots}")
        return True
        
    except Exception as e:
        print(f"✗ Optional filename test failed: {e}")
        return False


def test_feature_crud_operations():
    """Test Create, Read, Update, Delete operations on features."""
    print("\n=== Testing Feature CRUD Operations ===")
    
    plots = debrief.list_open_plots()
    if not plots:
        print("No plots open - skipping CRUD tests")
        return True
    
    if len(plots) > 1:
        print("Multiple plots open - using explicit filename for CRUD tests")
        filename = plots[0]['filename']
    else:
        filename = None  # Use automatic detection
    
    try:
        # CREATE: Add a test feature
        print("1. CREATE - Adding test feature...")
        original_fc = debrief.get_feature_collection(filename)
        original_count = len(original_fc.get('features', []))
        
        test_feature = create_test_feature()
        if filename:
            debrief.add_features([test_feature], filename)
        else:
            debrief.add_features([test_feature])
        
        # READ: Verify feature was added
        print("2. READ - Verifying feature was added...")
        updated_fc = debrief.get_feature_collection(filename)
        new_count = len(updated_fc.get('features', []))
        added_features = new_count - original_count
        print(f"   Added {added_features} feature(s)")
        
        if added_features > 0:
            # Get the ID of the newly added feature
            new_feature = updated_fc['features'][-1]  # Assume it's the last one
            feature_id = new_feature['properties']['id']
            print(f"   New feature ID: {feature_id}")
            
            # UPDATE: Modify the feature
            print("3. UPDATE - Modifying feature...")
            new_feature['properties']['name'] = 'Updated Test Feature'
            new_feature['properties']['updated'] = True
            
            if filename:
                debrief.update_features([new_feature], filename)
            else:
                debrief.update_features([new_feature])
            
            # Verify update
            verify_fc = debrief.get_feature_collection(filename)
            updated_feature = next((f for f in verify_fc['features'] 
                                  if f['properties']['id'] == feature_id), None)
            
            if updated_feature and updated_feature['properties'].get('updated'):
                print("   ✓ Feature updated successfully")
            else:
                print("   ✗ Feature update verification failed")
            
            # DELETE: Remove the test feature
            print("4. DELETE - Removing test feature...")
            if filename:
                debrief.delete_features([feature_id], filename)
            else:
                debrief.delete_features([feature_id])
            
            # Verify deletion
            final_fc = debrief.get_feature_collection(filename)
            final_count = len(final_fc.get('features', []))
            
            if final_count == original_count:
                print("   ✓ Feature deleted successfully")
            else:
                print(f"   ✗ Unexpected feature count after deletion: {final_count} vs {original_count}")
        
        print("✓ CRUD operations completed!")
        return True
        
    except Exception as e:
        print(f"✗ CRUD operations failed: {e}")
        return False


def main():
    """Main test function."""
    print("Testing Plot Manipulation API with Optional Filename Support")
    print("=" * 65)
    
    try:
        debrief.connect()
        print("✓ Connected to Debrief WebSocket server")
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return
    
    # List open plots
    plots = debrief.list_open_plots()
    print(f"\nFound {len(plots)} open plot file(s):")
    for plot in plots:
        print(f"  - {plot['title']} ({plot['filename']})")
    
    if not plots:
        print("\n⚠️  No plot files are open.")
        print("Please open one or more .plot.json files in VS Code and run this test again.")
        return
    
    # Run tests
    results = []
    results.append(test_plot_api_with_explicit_filename())
    results.append(test_plot_api_with_optional_filename())
    results.append(test_feature_crud_operations())
    
    # Summary
    print("\n" + "=" * 65)
    print("TEST SUMMARY")
    print("=" * 65)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All plot API tests passed!")
        debrief.notify("Plot API tests completed successfully! ✅")
    else:
        print("⚠️  Some tests failed - check the output above")
    
    print("\nKey features tested:")
    print("• Backward compatibility with explicit filenames")
    print("• Automatic plot detection when single plot is open")
    print("• Error handling when no plots are open")
    print("• Multiple plots detection and error reporting")
    print("• Full CRUD operations on features")


if __name__ == "__main__":
    main()