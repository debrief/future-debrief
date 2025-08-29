#!/usr/bin/env python3
"""
Basic connection test for Debrief WebSocket Bridge
"""

import time
from debrief_api import debrief, DebriefAPIError

def test_basic_connection():
    """Test basic connection and echo functionality."""
    print("Testing basic WebSocket connection...")
    
    try:
        # Connect to the server
        print("Connecting to WebSocket server...")
        debrief.connect()
        print("✓ Connected successfully!")
        
        # Test basic message sending
        print("\nTesting basic message sending...")
        response = debrief.send_raw_message("Hello from Python!")
        print(f"✓ Received response: {response}")
        
        # Test another message
        response2 = debrief.send_raw_message("Test message 2")
        print(f"✓ Received response: {response2}")
        
        print("\n✓ Basic connection test passed!")
        
    except DebriefAPIError as e:
        print(f"✗ API Error: {e}")
        if e.code:
            print(f"  Error code: {e.code}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

if __name__ == "__main__":
    test_basic_connection()