/**
 * Test script to understand MCP protocol for calling tools
 */

// Test calling the FastMCP server to understand the protocol
async function testMCPProtocol() {
    const baseUrl = 'http://21.0.0.58:8000';

    console.log('Testing MCP Protocol...\n');

    // Test 1: List tools
    console.log('1. Listing tools via GET /sse...');
    try {
        // MCP uses Server-Sent Events (SSE) for communication
        // The MCP protocol uses JSON-RPC 2.0 over SSE

        // For SSE, we need to establish an EventSource connection
        // But for testing, let's try the HTTP approach first

        const response = await fetch(`${baseUrl}/sse`);
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const text = await response.text();
        console.log('Response (first 500 chars):', text.substring(0, 500));

    } catch (error) {
        console.error('Error:', error);
    }

    // Test 2: Understanding MCP JSON-RPC format
    console.log('\n2. Understanding MCP JSON-RPC format...');
    console.log('MCP uses JSON-RPC 2.0 protocol');
    console.log('Example list_tools request:');
    const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
    };
    console.log(JSON.stringify(listToolsRequest, null, 2));

    console.log('\nExample call_tool request:');
    const callToolRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'text_word_count',
            arguments: {
                text: 'Hello world test'
            }
        }
    };
    console.log(JSON.stringify(callToolRequest, null, 2));
}

// Run the test
testMCPProtocol().catch(console.error);
