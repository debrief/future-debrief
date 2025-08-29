#!/usr/bin/env python3
"""
Test script for optional filename functionality.

This script tests the new feature where filename parameters are optional.
When omitted, the system will:
- Use the single open plot if only one is available
- Prompt the user to choose if multiple plots are open
- Return an error if no plots are open
"""

from debrief_api import debrief, DebriefAPIError
import json


def test_list_open_plots():
    """Test the list_open_plots command."""
    print("Testing list_open_plots command...")
    try:
        plots = debrief.list_open_plots()
        print(f"Open plots: {plots}")
        return plots
    except Exception as e:
        print(f"Error: {e}")
        return []


def test_optional_filename_single_plot():
    """Test optional filename when single plot is open."""
    print("\n=== Testing optional filename with single plot ===")
    
    try:
        # Test get_feature_collection without filename
        print("Getting feature collection without specifying filename...")
        fc = debrief.get_feature_collection()
        print(f"Success! Got {len(fc.get('features', []))} features")
        
        # Test get_selected_features without filename
        print("Getting selected features without specifying filename...")
        selected = debrief.get_selected_features()
        print(f"Success! Got {len(selected)} selected features")
        
        print("Single plot tests passed!")
        return True
        
    except Exception as e:
        print(f"Error in single plot test: {e}")
        return False


def test_optional_filename_no_plots():
    """Test optional filename when no plots are open."""
    print("\n=== Testing optional filename with no plots open ===")
    
    try:
        # This should fail with a clear error message
        fc = debrief.get_feature_collection()
        print("ERROR: This should have failed!")
        return False
        
    except DebriefAPIError as e:
        if "No plot files are currently open" in str(e):
            print("Success! Got expected error for no open plots")
            return True
        else:
            print(f"Got unexpected error: {e}")
            return False
    except Exception as e:
        print(f"Got unexpected exception: {e}")
        return False


def test_multiple_plots_scenario():
    """Test the multiple plots scenario (manual test)."""
    print("\n=== Testing multiple plots scenario ===")
    print("This test requires manually opening multiple .plot.json files in VS Code")
    print("and then running the commands to see the user selection prompt.")
    
    plots = test_list_open_plots()
    if len(plots) > 1:
        print(f"Found {len(plots)} open plots - testing multiple plot handling...")
        
        try:
            # This should prompt the user to choose
            print("Attempting to get feature collection without filename...")
            fc = debrief.get_feature_collection()
            print(f"Success! User selected a plot and got {len(fc.get('features', []))} features")
            return True
            
        except Exception as e:
            print(f"Error: {e}")
            return False
    else:
        print("Need multiple plots open to test this scenario")
        return True  # Not a failure, just can't test


def main():
    """Main test function."""
    print("Testing optional filename functionality...")
    
    try:
        debrief.connect()
        print("Connected to Debrief WebSocket server")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
    
    # Test listing open plots
    plots = test_list_open_plots()
    
    if len(plots) == 0:
        print("\n=== No plots open - testing error handling ===")
        test_optional_filename_no_plots()
    elif len(plots) == 1:
        print(f"\n=== One plot open ({plots[0]['filename']}) - testing single plot scenario ===")
        test_optional_filename_single_plot()
    else:
        print(f"\n=== Multiple plots open ({len(plots)}) - testing multiple plot scenario ===")
        test_multiple_plots_scenario()
    
    print("\n=== Test Summary ===")
    print("The optional filename feature allows:")
    print("1. Omitting filename when only one plot is open")
    print("2. Interactive selection when multiple plots are open")
    print("3. Clear error messages when no plots are open")
    print("4. Backward compatibility when filename is provided")


if __name__ == "__main__":
    main()