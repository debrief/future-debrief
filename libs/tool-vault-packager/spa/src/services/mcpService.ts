import type { MCPToolListResponse, MCPToolCallRequest, MCPToolCallResponse, ToolIndex, ToolVaultRootResponse } from '../types';

const MCP_BASE_URL = import.meta.env.VITE_MCP_BASE_URL || '/tools';

export class MCPService {
  private baseUrl: string;
  private toolsListUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MCP_BASE_URL;
  }

  async discoverEndpoints(): Promise<ToolVaultRootResponse> {
    try {
      // Get root endpoint to discover available endpoints
      // Use /api proxy to reach the Python server root endpoint
      const rootUrl = '/api';
      
      console.log('Attempting to discover endpoints at:', rootUrl);
      const response = await fetch(rootUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch root endpoint: ${response.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error(`Expected JSON response, got: ${contentType}`);
      }
      
      const rootInfo = await response.json();
      
      // Extract tools list URL from discovery
      if (rootInfo.endpoints?.tools) {
        this.toolsListUrl = rootInfo.endpoints.tools;
      } else {
        // Fallback to default if not provided
        this.toolsListUrl = `${this.baseUrl}/list`;
      }
      
      console.log('Discovery successful:', { rootInfo, toolsListUrl: this.toolsListUrl });
      return rootInfo;
    } catch (error) {
      console.error('Error discovering endpoints:', error);
      // Fallback to default URL structure
      this.toolsListUrl = `${this.baseUrl}/list`;
      throw error;
    }
  }

  async listTools(): Promise<MCPToolListResponse> {
    try {
      // Ensure we've discovered endpoints first
      if (!this.toolsListUrl) {
        await this.discoverEndpoints();
      }

      const response = await fetch(this.toolsListUrl!);
      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tools list:', error);
      throw error;
    }
  }

  async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to call tool: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error calling tool:', error);
      throw error;
    }
  }

  async loadToolIndex(toolName: string, indexPath?: string): Promise<ToolIndex> {
    const path = indexPath || `/tools/${toolName}/index.json`;
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load tool index: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading tool index for ${toolName}:`, error);
      throw error;
    }
  }

  async loadSampleInput(inputPath: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(inputPath);
      if (!response.ok) {
        throw new Error(`Failed to load sample input: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading sample input from ${inputPath}:`, error);
      throw error;
    }
  }

  async loadSourceCode(sourcePath: string): Promise<string> {
    try {
      const response = await fetch(sourcePath);
      if (!response.ok) {
        throw new Error(`Failed to load source code: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error loading source code from ${sourcePath}:`, error);
      throw error;
    }
  }

  async loadGitHistory(historyPath: string): Promise<unknown> {
    try {
      const response = await fetch(historyPath);
      if (!response.ok) {
        throw new Error(`Failed to load git history: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading git history from ${historyPath}:`, error);
      throw error;
    }
  }
}

export const mcpService = new MCPService();