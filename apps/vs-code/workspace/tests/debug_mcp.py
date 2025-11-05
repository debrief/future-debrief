#!/usr/bin/env python3
"""
Debug script to see what the MCP server is actually returning
"""

from mcp_client import MCPClient, MCPError
import json

print("=" * 60)
print("MCP Stateless Debug Script")
print("=" * 60)

# Create client (no session in stateless mode)
client = MCPClient()
print("Client created (stateless mode - no session)\n")

# Test 1: Check health endpoint
print("=" * 60)
print("Test 1: Health Check")
print("=" * 60)
try:
    if client.test_connection():
        print("✓ Server is accessible")
    else:
        print("✗ Server is not accessible")
except Exception as e:
    print(f"Error: {e}")

# Test 2: List resources
print("\n" + "=" * 60)
print("Test 2: List Resources")
print("=" * 60)
try:
    resources = client.list_resources()
    print(f"✓ Found {len(resources)} resource(s):")
    for resource in resources:
        print(f"  - {resource.get('uri', 'unknown')}: {resource.get('name', 'unnamed')}")
except MCPError as e:
    print(f"✗ MCP Error: {e}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 3: Try to read plot://features resource
print("\n" + "=" * 60)
print("Test 3: Read plot://features")
print("=" * 60)
try:
    features = client.read_resource("plot://features")
    feature_count = len(features.get('features', [])) if isinstance(features, dict) else 0
    print(f"✓ Successfully read features resource")
    print(f"  Feature count: {feature_count}")
except MCPError as e:
    print(f"✗ MCP Error: {e}")
    if e.data:
        print(f"  Additional data: {e.data}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 4: List tools
print("\n" + "=" * 60)
print("Test 4: List Tools")
print("=" * 60)
try:
    tools = client.list_tools()
    print(f"✓ Found {len(tools)} tool(s):")
    for tool in tools:
        print(f"  - {tool.get('name', 'unknown')}: {tool.get('description', 'no description')}")
except MCPError as e:
    print(f"✗ MCP Error: {e}")
except Exception as e:
    print(f"✗ Error: {e}")

# Test 5: Test notification
print("\n" + "=" * 60)
print("Test 5: Send Notification")
print("=" * 60)
try:
    result = client.notify("Debug script test notification")
    print(f"✓ Notification sent: {result}")
except MCPError as e:
    print(f"✗ MCP Error: {e}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "=" * 60)
print("Debug Complete")
print("=" * 60)
