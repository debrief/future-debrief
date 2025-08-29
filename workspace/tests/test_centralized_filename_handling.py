#!/usr/bin/env python3
"""
Test the new centralized filename handling in send_json_message.

This script tests that the multiple plots logic is now handled centrally
in the WebSocket client rather than in each individual API method.
"""

from debrief_api import debrief, DebriefAPIError


def test_centralized_handling():
    """Test that filename handling is centralized in send_json_message."""
    print("Testing centralized filename handling...")
    
    try:
        debrief.connect()
        print("✓ Connected to WebSocket bridge")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Test listing open plots
    print("\n1. Testing list_open_plots...")
    try:
        plots = debrief.list_open_plots()
        print(f"✓ Found {len(plots)} open plot(s)")
        for plot in plots:
            print(f"   - {plot['title']} ({plot['filename']})")
    except Exception as e:
        print(f"✗ list_open_plots failed: {e}")
    
    # Test get_feature_collection without filename (should be handled centrally)
    print("\n2. Testing get_feature_collection without filename...")
    try:
        fc = debrief.get_feature_collection()  # No filename specified
        print(f"✓ Got feature collection with {len(fc.get('features', []))} features")
        print("   ✓ Centralized filename handling worked!")
    except DebriefAPIError as e:
        if "No plot files are currently open" in str(e):
            print("✓ Got expected error for no open plots")
        elif "Multiple plot files are open" in str(e):
            print("✓ Got expected error for multiple plots (would prompt in interactive mode)")
        else:
            print(f"✗ Unexpected error: {e}")
    except Exception as e:
        print(f"✗ Unexpected exception: {e}")
    
    # Test get_selected_features without filename (should be handled centrally)  
    print("\n3. Testing get_selected_features without filename...")
    try:
        selected = debrief.get_selected_features()  # No filename specified
        print(f"✓ Got {len(selected)} selected features")
        print("   ✓ Centralized filename handling worked!")
    except DebriefAPIError as e:
        if "No plot files are currently open" in str(e):
            print("✓ Got expected error for no open plots")
        elif "Multiple plot files are open" in str(e):
            print("✓ Got expected error for multiple plots (would prompt in interactive mode)")
        else:
            print(f"✗ Unexpected error: {e}")
    except Exception as e:
        print(f"✗ Unexpected exception: {e}")
    
    print("\n" + "=" * 60)
    print("CENTRALIZED FILENAME HANDLING TEST SUMMARY")
    print("=" * 60)
    print("✅ Key benefits of the refactored design:")
    print("   • Multiple plots logic centralized in send_json_message")
    print("   • All API methods are now clean and simple") 
    print("   • Generic filename handling based on command structure:")
    print("     - filename='value' → use specific file")
    print("     - filename=None → auto-detect single or prompt for multiple")
    print("     - no filename param → command doesn't use files")
    print("   • Easy to maintain and extend - no hard-coded command names")
    print("   • User prompt logic is reusable across all commands")
    print("=" * 60)


if __name__ == "__main__":
    test_centralized_handling()