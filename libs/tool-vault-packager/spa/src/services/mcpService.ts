import type { MCPToolListResponse, MCPToolCallRequest, MCPToolCallResponse, ToolIndex } from '../types';

const MCP_BASE_URL = import.meta.env.VITE_MCP_BASE_URL || '/tools';

export class MCPService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MCP_BASE_URL;
  }
  async listTools(): Promise<MCPToolListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/list`);
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

  async loadSampleInput(inputPath: string): Promise<any> {
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

  async loadGitHistory(historyPath: string): Promise<any> {
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