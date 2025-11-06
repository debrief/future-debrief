#!/usr/bin/env python3
"""
Test MCP connection to Debrief VS Code extension using JSON-RPC 2.0 protocol
"""

from mcp_client import MCPClient, MCPError

try:
    print("Testing MCP connection to Debrief...")

    # Create MCP client
    client = MCPClient()

    # Test basic connectivity
    if not client.test_connection():
        print("✗ Health check failed - server not responding")
        raise Exception("Server not accessible")

    print("✓ Health check successful!")

    # List available tools
    tools = client.list_tools()
    print(f"✓ Found {len(tools)} available tools")

    # List available resources
    resources = client.list_resources()
    print(f"✓ Found {len(resources)} available resources")

    # Try to list open plots
    plots = client.list_plots()
    print(f"✓ List command works! Open plots: {plots}")

    # Test notification
    client.notify("MCP connection test successful!")
    print("✓ Notification sent successfully")

    print("\n✓ All MCP connection tests passed!")

except MCPError as e:
    print(f"✗ MCP Error: {e}")
    if e.data:
        print(f"  Additional data: {e.data}")
except Exception as e:
    print(f"✗ Connection failed: {e}")
    print("\nMake sure:")
    print("1. VS Code is running")
    print("2. The Debrief extension is activated")
    print("3. The MCP server is listening on port 60123")