#!/bin/bash

# Test script for FastMCP Hybrid Server
# Usage: ./test_hybrid_server.sh

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PORT=8000
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FastMCP Hybrid Server Test Suite${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Start server in background
echo -e "${YELLOW}Starting hybrid server on ${BASE_URL}...${NC}"
python cli.py serve-hybrid --port ${PORT} --host ${HOST} > /tmp/hybrid-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Server stopped${NC}"
}
trap cleanup EXIT

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
echo "GET ${BASE_URL}/health"
HEALTH=$(curl -s ${BASE_URL}/health)
echo "$HEALTH" | jq .
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi

# Test 2: Tool Listing
echo -e "\n${YELLOW}Test 2: Tool Listing${NC}"
echo "GET ${BASE_URL}/tools/list"
TOOLS=$(curl -s ${BASE_URL}/tools/list)
TOOL_COUNT=$(echo "$TOOLS" | jq -r '.root | length')
echo "Found $TOOL_COUNT tool categories"
if [ "$TOOL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Tool listing passed${NC}"
    echo "Categories:"
    echo "$TOOLS" | jq -r '.root[] | "  - \(.name) (\(.type))"'
else
    echo -e "${RED}✗ Tool listing failed${NC}"
    exit 1
fi

# Test 3: Word Count Tool
echo -e "\n${YELLOW}Test 3: Word Count Tool Execution${NC}"
echo "POST ${BASE_URL}/tools/call"
WORD_COUNT_RESULT=$(curl -s -X POST ${BASE_URL}/tools/call \
    -H "Content-Type: application/json" \
    -d '{"name":"word_count","arguments":{"text":"Hello FastMCP world testing!"}}')
echo "$WORD_COUNT_RESULT" | jq .
WORD_COUNT=$(echo "$WORD_COUNT_RESULT" | jq -r '.result.payload')
if echo "$WORD_COUNT" | grep -q "Word count: 4"; then
    echo -e "${GREEN}✓ Word count tool passed${NC}"
else
    echo -e "${RED}✗ Word count tool failed${NC}"
    echo "Expected: Word count: 4"
    echo "Got: $WORD_COUNT"
    exit 1
fi

# Test 4: Empty Text Edge Case
echo -e "\n${YELLOW}Test 4: Empty Text Edge Case${NC}"
EMPTY_RESULT=$(curl -s -X POST ${BASE_URL}/tools/call \
    -H "Content-Type: application/json" \
    -d '{"name":"word_count","arguments":{"text":""}}')
echo "$EMPTY_RESULT" | jq .
EMPTY_COUNT=$(echo "$EMPTY_RESULT" | jq -r '.result.payload')
if echo "$EMPTY_COUNT" | grep -q "Word count: 0"; then
    echo -e "${GREEN}✓ Empty text edge case passed${NC}"
else
    echo -e "${RED}✗ Empty text edge case failed${NC}"
    exit 1
fi

# Test 5: Invalid Tool Name
echo -e "\n${YELLOW}Test 5: Invalid Tool Name (Error Handling)${NC}"
INVALID_RESULT=$(curl -s -X POST ${BASE_URL}/tools/call \
    -H "Content-Type: application/json" \
    -d '{"name":"nonexistent_tool","arguments":{}}')
echo "$INVALID_RESULT" | jq .
if echo "$INVALID_RESULT" | jq -e '.error' > /dev/null; then
    echo -e "${GREEN}✓ Error handling passed${NC}"
else
    echo -e "${RED}✗ Error handling failed${NC}"
    exit 1
fi

# Test 6: Root Endpoint
echo -e "\n${YELLOW}Test 6: Root Endpoint Discovery${NC}"
echo "GET ${BASE_URL}/"
ROOT=$(curl -s ${BASE_URL}/)
echo "$ROOT" | jq .
if echo "$ROOT" | jq -e '.name' > /dev/null; then
    echo -e "${GREEN}✓ Root endpoint passed${NC}"
else
    echo -e "${RED}✗ Root endpoint failed${NC}"
    exit 1
fi

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "Server logs available at: /tmp/hybrid-server.log"
echo ""
echo "The hybrid server successfully:"
echo "  - Started and responded to health checks"
echo "  - Listed all available tools"
echo "  - Executed tools with correct results"
echo "  - Handled edge cases properly"
echo "  - Provided proper error handling"
echo ""
echo -e "${GREEN}FastMCP hybrid implementation is working perfectly!${NC}"
