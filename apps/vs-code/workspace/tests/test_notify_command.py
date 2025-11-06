#!/usr/bin/env python3
"""
Test the notify command for Debrief MCP Server
"""

import time
from mcp_client import MCPClient, MCPError

def test_notify_command():
    """Test notify functionality."""
    print("Testing notify command...")

    client = MCPClient()

    try:
        # Test basic notification
        print("\nSending notification to VS Code...")
        client.notify("Hello from Python! This is a test notification.")
        print("✓ Notification sent successfully!")

        # Test multiple notifications
        print("\nSending multiple notifications...")
        for i in range(3):
            client.notify(f"Test notification {i + 1}")
            time.sleep(1)  # Small delay between notifications
        print("✓ Multiple notifications sent!")

        # Test notification with special characters
        print("\nTesting notification with special characters...")
        client.notify("Special chars: àáâãäåæçèéêë 🚀 ✨ 💻")
        print("✓ Special character notification sent!")

        # Test different notification levels
        print("\nTesting different notification levels...")
        client.notify("Info notification", level="info")
        time.sleep(0.5)
        client.notify("Warning notification", level="warning")
        time.sleep(0.5)
        client.notify("Error notification", level="error")
        print("✓ Different notification levels sent!")

        print("\n✓ Notify command test completed!")

    except MCPError as e:
        print(f"✗ MCP Error: {e}")
        if e.data:
            print(f"  Additional data: {e.data}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")

if __name__ == "__main__":
    test_notify_command()