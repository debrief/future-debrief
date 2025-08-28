#!/usr/bin/env python3
"""
Test error handling and reconnection for Debrief WebSocket Bridge
"""

import time
from debrief_api import notify, send_json_message, DebriefAPIError

def test_error_handling():
    """Test error handling and reconnection."""
    print("Testing error handling and reconnection...")
    
    try:
        # Test malformed notify command
        print("\nTesting malformed notify command...")
        try:
            response = send_json_message({
                "command": "notify",
                "params": {
                    "wrong_param": "This should fail"
                }
            })
            print(f"Unexpected success: {response}")
        except DebriefAPIError as e:
            print(f"✓ Expected error for malformed command: {e}")
        
        # Test notify command without message
        print("\nTesting notify command without message parameter...")
        try:
            response = send_json_message({
                "command": "notify",
                "params": {}
            })
            print(f"Unexpected success: {response}")
        except DebriefAPIError as e:
            print(f"✓ Expected error for missing message: {e}")
        
        # Test valid notify after errors
        print("\nTesting valid notify after errors...")
        notify("This notification should work after the previous errors.")
        print("✓ Valid notification after errors succeeded!")
        
        # Test multiple sequential calls
        print("\nTesting multiple sequential calls...")
        for i in range(5):
            notify(f"Sequential notification {i + 1}")
        print("✓ Multiple sequential calls completed!")
        
        print("\n✓ Error handling test completed!")
        
    except DebriefAPIError as e:
        print(f"✗ API Error: {e}")
        if e.code:
            print(f"  Error code: {e.code}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

if __name__ == "__main__":
    test_error_handling()