#!/usr/bin/env python3
"""
Demo: Generic filename handling based on command structure.

This demonstrates how the new generic system works:
- filename='value' → use specific file
- filename=None → auto-detect single or prompt for multiple  
- no filename param → command doesn't use files
"""

from debrief_api import debrief


def demo_generic_handling():
    """Demonstrate the three filename handling modes."""
    print("=" * 65)
    print("DEMO: Generic Filename Handling")
    print("=" * 65)
    
    try:
        debrief.connect()
        print("✓ Connected to WebSocket bridge\n")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    # Mode 1: No filename parameter (command doesn't use files)
    print("1. Commands WITHOUT filename parameter:")
    print("   • notify() - doesn't work with files")
    print("   • list_open_plots() - lists all files")
    try:
        debrief.notify("Demo: Generic filename handling")
        plots = debrief.list_open_plots()
        print(f"   ✓ Found {len(plots)} plot file(s)")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Mode 2: filename=None (auto-detect or prompt)
    print("\n2. Commands WITH filename=None (auto-detect):")
    print("   • get_feature_collection() - auto-detects plot file")
    try:
        fc = debrief.get_feature_collection()  # filename defaults to None
        print(f"   ✓ Auto-detected plot and got {len(fc.get('features', []))} features")
    except Exception as e:
        print(f"   ✓ Expected behavior: {e}")
    
    # Mode 3: filename='specific_file' (use that file)  
    print("\n3. Commands WITH filename='specific_file':")
    plots = debrief.list_open_plots()
    if plots:
        filename = plots[0]['filename']
        print(f"   • get_feature_collection('{filename}') - use specific file")
        try:
            fc = debrief.get_feature_collection(filename)
            print(f"   ✓ Used specific file and got {len(fc.get('features', []))} features")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    else:
        print("   • No plots open to demonstrate specific filename usage")
    
    # Show how this works at the protocol level
    print("\n" + "=" * 65)
    print("HOW IT WORKS (Protocol Level):")
    print("=" * 65)
    print("The send_json_message() method inspects the command structure:")
    print()
    print("1. Command with NO filename parameter:")
    print('   {"command": "notify", "params": {"message": "test"}}')
    print("   → Sent directly (no filename handling)")
    print()
    print("2. Command with filename=None:")
    print('   {"command": "get_feature_collection", "params": {"filename": null}}')
    print("   → Try without filename, handle MULTIPLE_PLOTS if needed")
    print()
    print("3. Command with specific filename:")
    print('   {"command": "get_feature_collection", "params": {"filename": "test.plot.json"}}')
    print("   → Sent directly (specific file requested)")
    print()
    print("✅ This generic approach eliminates hard-coded command lists!")
    print("✅ Adding new filename-optional commands requires no client changes!")
    print("=" * 65)


if __name__ == "__main__":
    demo_generic_handling()