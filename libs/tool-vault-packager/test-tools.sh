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

# Test 1: Health check
echo "Test 1: Health Check"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq . || echo "❌ Health check failed"
echo ""
echo ""

# Test 2: List tools
echo "Test 2: List All Tools"
echo "GET $BASE_URL/tools/list"
TOOL_COUNT=$(curl -s "$BASE_URL/tools/list" | jq '.root | length')
echo "✅ Found $TOOL_COUNT tool categories"
curl -s "$BASE_URL/tools/list" | jq -r '.root[].name' | sed 's/^/  - /'
echo ""
echo ""

# Test 3: Word count tool
echo "Test 3: Execute word_count Tool"
echo "POST $BASE_URL/tools/call"
RESPONSE=$(curl -s -X POST "$BASE_URL/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"word_count","arguments":{"text":"Hello FastMCP world"}}')
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.result.payload | contains("Word count: 3")' > /dev/null; then
    echo "✅ Word count correct!"
else
    echo "❌ Word count incorrect"
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
echo "$RESPONSE" | jq .
if echo "$RESPONSE" | jq -e '.isError == false' > /dev/null; then
    echo "✅ Tool executed successfully!"
else
    echo "❌ Tool execution failed"
fi
echo ""
echo ""

echo "========================================"
echo "Test Summary"
echo "========================================"
echo "All tests completed!"
echo ""
echo "Available tools:"
curl -s "$BASE_URL/tools/list" | jq -r '.root[] | "\(.name) (\(.tools | length) tools)"' | sed 's/^/  ✓ /'
