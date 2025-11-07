#!/bin/bash
# Test script for Tool Vault production server
# Usage: ./test-tools.sh [port]

PORT=${1:-8000}
BASE_URL="http://localhost:${PORT}"

echo "========================================"
echo "Tool Vault Test Script"
echo "Testing server at: $BASE_URL"
echo "========================================"
echo ""

# Check if server is running
echo "Checking if server is running..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Server not responding (HTTP $HTTP_CODE)"
    echo ""
    echo "Please start the server first:"
    echo "  python cli.py serve-hybrid --port $PORT"
    echo ""
    exit 1
fi
echo "✅ Server is running!"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "GET $BASE_URL/health"
RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE" | jq .
    echo "✅ Health check passed"
else
    echo "❌ Health check failed - Invalid JSON response:"
    echo "$RESPONSE"
fi
echo ""
echo ""

# Test 2: List tools
echo "Test 2: List All Tools"
echo "GET $BASE_URL/tools/list"
RESPONSE=$(curl -s "$BASE_URL/tools/list")
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    TOOL_COUNT=$(echo "$RESPONSE" | jq '.root | length')
    echo "✅ Found $TOOL_COUNT tool categories"
    echo "$RESPONSE" | jq -r '.root[].name' | sed 's/^/  - /'
else
    echo "❌ Failed to list tools - Invalid JSON response:"
    echo "$RESPONSE"
fi
echo ""
echo ""

# Test 3: Word count tool
echo "Test 3: Execute word_count Tool"
echo "POST $BASE_URL/tools/call"
RESPONSE=$(curl -s -X POST "$BASE_URL/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"word_count","arguments":{"text":"Hello FastMCP world"}}')
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE" | jq .
    if echo "$RESPONSE" | jq -e '.result.payload | contains("Word count: 3")' >/dev/null 2>&1; then
        echo "✅ Word count correct!"
    else
        echo "⚠️ Unexpected word count result"
    fi
else
    echo "❌ Failed to execute word_count - Invalid JSON response:"
    echo "$RESPONSE"
fi
echo ""
echo ""

# Test 4: Select all visible tool
echo "Test 4: Execute select_all_visible Tool"
echo "POST $BASE_URL/tools/call"
RESPONSE=$(curl -s -X POST "$BASE_URL/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"select_all_visible",
    "arguments":{
      "viewport":{"bounds":[[0,0],[1,1]],"zoom":10},
      "features":[
        {"type":"Feature","geometry":{"type":"Point","coordinates":[0.5,0.5]},"properties":{}}
      ]
    }
  }')
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE" | jq .
    if echo "$RESPONSE" | jq -e '.isError == false' >/dev/null 2>&1; then
        echo "✅ Tool executed successfully!"
    else
        echo "⚠️ Tool returned an error"
    fi
else
    echo "❌ Failed to execute tool - Invalid JSON response:"
    echo "$RESPONSE"
fi
echo ""
echo ""

echo "========================================"
echo "Test Summary"
echo "========================================"
echo "All tests completed!"
echo ""
echo "Available tools:"
RESPONSE=$(curl -s "$BASE_URL/tools/list")
if echo "$RESPONSE" | jq . >/dev/null 2>&1; then
    echo "$RESPONSE" | jq -r '.root[] | "\(.name) (\(.tools | length) tools)"' | sed 's/^/  ✓ /'
else
    echo "  (Could not fetch tool list)"
fi
