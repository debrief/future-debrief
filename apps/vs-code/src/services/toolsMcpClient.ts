/**
 * Tools MCP Client Service
 *
 * Connects to the pure FastMCP tools server for maritime analysis tool execution.
 * Uses the MCP protocol to list tools and execute them.
 */

import * as vscode from 'vscode';
import { ToolSchema } from '@debrief/web-components/services';

export interface McpTool {
    name: string;
    description?: string;
    inputSchema?: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
}

export interface McpToolListResponse {
    tools: McpTool[];
}

export interface McpToolCallRequest {
    name: string;
    arguments: Record<string, unknown>;
}

export interface McpToolCallResponse {
    content: Array<{
        type: string;
        text?: string;
    }>;
    isError?: boolean;
}

export class ToolsMcpClient {
    private static instance: ToolsMcpClient;
    private config: {
        url: string;
    } | null = null;
    private outputChannel: vscode.OutputChannel;
    private mcpClient: any = null;
    private isConnected = false;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Tools MCP Client');
    }

    static getInstance(): ToolsMcpClient {
        if (!ToolsMcpClient.instance) {
            ToolsMcpClient.instance = new ToolsMcpClient();
        }
        return ToolsMcpClient.instance;
    }

    /**
     * Connect to the MCP server
     */
    async connect(url?: string): Promise<void> {
        const mcpUrl = url || 'http://localhost:8000';

        this.config = { url: mcpUrl };
        this.log(`Connecting to Tools MCP server at ${mcpUrl}`);

        try {
            // Test connection with a simple fetch
            const healthUrl = `${mcpUrl}/health`;
            const response = await fetch(healthUrl);

            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
            }

            const health = await response.text();
            this.log(`Health check passed: ${health}`);
            this.isConnected = true;
            this.log('Successfully connected to Tools MCP server');

        } catch (error) {
            const message = `Failed to connect to Tools MCP server: ${error instanceof Error ? error.message : String(error)}`;
            this.log(message);
            this.isConnected = false;
            throw new Error(message);
        }
    }

    /**
     * Get the list of available tools from the MCP server
     */
    async getToolList(): Promise<McpTool[]> {
        if (!this.isConnected || !this.config) {
            throw new Error('Not connected to Tools MCP server');
        }

        try {
            this.log('Fetching tool list from MCP server');

            // MCP uses JSON-RPC 2.0 over HTTP/SSE
            // For listing tools, we use the tools/list method
            const request = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/list',
                params: {}
            };

            const response = await fetch(`${this.config.url}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
            }

            if (!data.result || !Array.isArray(data.result.tools)) {
                throw new Error('Invalid response format from MCP server');
            }

            const tools = data.result.tools as McpTool[];
            this.log(`Retrieved ${tools.length} tools from MCP server`);

            return tools;

        } catch (error) {
            const message = `Failed to get tool list: ${error instanceof Error ? error.message : String(error)}`;
            this.log(message);
            throw new Error(message);
        }
    }

    /**
     * Execute a tool on the MCP server
     */
    async executeTool(toolName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; result?: unknown; error?: string }> {
        if (!this.isConnected || !this.config) {
            return {
                success: false,
                error: 'Not connected to Tools MCP server'
            };
        }

        try {
            this.log(`Executing tool: ${toolName}`);
            this.log(`Parameters: ${JSON.stringify(parameters, null, 2)}`);

            // MCP uses JSON-RPC 2.0 for tool calls
            const request = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: parameters
                }
            };

            const response = await fetch(`${this.config.url}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.log(`HTTP Error: ${response.status} - ${errorText}`);
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const data = await response.json();

            if (data.error) {
                const errorMessage = data.error.message || JSON.stringify(data.error);
                this.log(`MCP Error: ${errorMessage}`);
                return {
                    success: false,
                    error: errorMessage
                };
            }

            // MCP tool responses have a result with content array
            if (!data.result || !Array.isArray(data.result.content)) {
                this.log(`Unexpected response format: ${JSON.stringify(data)}`);
                return {
                    success: false,
                    error: 'Invalid response format from MCP server'
                };
            }

            // Extract the result from the content array
            // The content is typically [{ type: 'text', text: '<json>' }]
            const content = data.result.content;
            let result: unknown;

            if (content.length > 0 && content[0].text) {
                try {
                    // Try to parse as JSON (DebriefCommand format)
                    result = JSON.parse(content[0].text);
                } catch {
                    // If not JSON, use as-is
                    result = { command: 'showText', payload: content[0].text };
                }
            } else {
                result = { command: 'showText', payload: 'No result' };
            }

            this.log(`Tool executed successfully: ${JSON.stringify(result, null, 2)}`);

            return {
                success: true,
                result
            };

        } catch (error) {
            const errorMessage = `Failed to execute tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`;
            this.log(`Error: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Convert MCP tools to ToolSchema format for compatibility
     */
    convertToToolIndex(mcpTools: McpTool[]): unknown {
        // Convert MCP tools to the legacy ToolRegistry format
        // The outline view expects a hierarchical structure with categories

        const toolsByCategory = new Map<string, McpTool[]>();

        // Group tools by category (extracted from name prefix)
        for (const tool of mcpTools) {
            const parts = tool.name.split('_');
            const category = parts[0] || 'general';

            if (!toolsByCategory.has(category)) {
                toolsByCategory.set(category, []);
            }
            toolsByCategory.get(category)!.push(tool);
        }

        // Build hierarchical structure
        const root: unknown[] = [];

        for (const [category, tools] of toolsByCategory.entries()) {
            const children = tools.map(tool => ({
                type: 'tool',
                name: tool.name,
                description: tool.description || '',
                parameters: tool.inputSchema || { type: 'object', properties: {} }
            }));

            root.push({
                type: 'category',
                name: category,
                children
            });
        }

        return { root };
    }

    /**
     * Check if client is connected
     */
    isRunning(): boolean {
        return this.isConnected;
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect(): Promise<void> {
        this.isConnected = false;
        this.config = null;
        this.log('Disconnected from Tools MCP server');
    }

    /**
     * Log a message to the output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
}
