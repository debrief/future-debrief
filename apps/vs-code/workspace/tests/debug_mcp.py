#!/usr/bin/env python3
"""
Debug script to see what the MCP server is actually returning
"""

import requests
import json

# Test 1: Check health endpoint
print("=" * 60)
print("Test 1: Health Check")
print("=" * 60)
try:
    response = requests.get("http://localhost:60123/health", timeout=2)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: List resources
print("\n" + "=" * 60)
print("Test 2: List Resources")
print("=" * 60)
try:
    response = requests.post(
        "http://localhost:60123/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "resources/list"
        },
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Try to read plot://features resource
print("\n" + "=" * 60)
print("Test 3: Read plot://features")
print("=" * 60)
try:
    response = requests.post(
        "http://localhost:60123/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "resources/read",
            "params": {
                "uri": "plot://features"
            }
        },
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

# Test 4: List tools
print("\n" + "=" * 60)
print("Test 4: List Tools")
print("=" * 60)
try:
    response = requests.post(
        "http://localhost:60123/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/list"
        },
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
