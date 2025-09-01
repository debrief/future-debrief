#!/usr/bin/env python3
"""
Test the notify command for Debrief WebSocket Bridge
"""

import time
from debrief_api import debrief, DebriefAPIError

def test_notify_command():
    """Test notify functionality."""
    print("Testing notify command...")
    
    try:
        # Test basic notification
        print("\nSending notification to VS Code...")
        debrief.notify("Hello from Python! This is a test notification.")
        print("✓ Notification sent successfully!")
        
        # Test multiple notifications
        print("\nSending multiple notifications...")
        for i in range(3):
            debrief.notify(f"Test notification {i + 1}")
            time.sleep(1)  # Small delay between notifications
        print("✓ Multiple notifications sent!")
        
        # Test notification with special characters
        print("\nTesting notification with special characters...")
        debrief.notify("Special chars: àáâãäåæçèéêë 🚀 ✨ 💻")
        print("✓ Special character notification sent!")
        
        print("\n✓ Notify command test completed!")
        
    except DebriefAPIError as e:
        print(f"✗ API Error: {e}")
        if e.code:
            print(f"  Error code: {e.code}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

if __name__ == "__main__":
    test_notify_command()