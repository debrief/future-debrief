#!/usr/bin/env python3
"""
Test the JSON message protocol for Debrief WebSocket Bridge
"""

import time
from debrief_api import send_json_message, DebriefAPIError

def test_json_protocol():
    """Test JSON message exchange."""
    print("Testing JSON message protocol...")
    
    try:
        # Test valid JSON command
        print("\nTesting valid JSON command...")
        test_message = {"command": "notify", "params": {"message": "JSON protocol test message"}}
        response = send_json_message(test_message)
        print(f"✓ Sent: {test_message}")
        print(f"✓ Received: {response}")
        
        # Test invalid command
        print("\nTesting invalid command...")
        try:
            response = send_json_message({"command": "invalid_command"})
            print(f"Unexpected success: {response}")
        except DebriefAPIError as e:
            print(f"✓ Expected error for invalid command: {e}")
        
        print("\n✓ JSON protocol test completed!")
        
    except DebriefAPIError as e:
        print(f"✗ API Error: {e}")
        if e.code:
            print(f"  Error code: {e.code}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

if __name__ == "__main__":
    test_json_protocol()