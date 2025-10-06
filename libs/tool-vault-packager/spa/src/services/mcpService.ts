import type { GlobalToolIndexModel, ToolCallResponse, ToolIndexModel, ToolVaultRootResponse, SPAToolCallRequest } from '../types';

// Auto-detect server URL or use environment variable override
const getServerBaseUrl = (): string => {
  // Priority 1: Auto-detect from window location (production mode - served from same server)
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const detectedUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;

    // Only use env var override if explicitly set AND different from detected URL
    // This allows development mode (Vite dev server) to override the backend URL
    const viteBackendUrl = import.meta.env.VITE_BACKEND_URL;
    const envBackendUrl = import.meta.env.BACKEND_URL;

    // If we're on the Vite dev server (port 5173), use the env var override
    if (port === '5173' && (viteBackendUrl || envBackendUrl)) {
      return envBackendUrl || viteBackendUrl;
    }

    // Otherwise, use auto-detected URL (production mode)
    return detectedUrl;
  }

  // Fallback for SSR or non-browser environments
  return import.meta.env.VITE_BACKEND_URL || import.meta.env.BACKEND_URL || 'http://localhost:8000';
};

const SERVER_BASE_URL = getServerBaseUrl();
const MCP_BASE_URL = `${SERVER_BASE_URL}/tools`;

export class MCPService {
  private baseUrl: string;
  private toolsListUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MCP_BASE_URL;
  }

  /**
   * Extract the base path for a tool from its tool_url.
   * E.g., '/api/tools/selection/fit_to_selection/tool.json' -> '/api/tools/selection/fit_to_selection'
   */
  private getToolBasePath(toolUrl?: string | null): string | null {
    if (!toolUrl) return null;
    // Remove the filename (e.g., 'tool.json') to get the base directory path
    const lastSlash = toolUrl.lastIndexOf('/');
    return lastSlash > 0 ? toolUrl.substring(0, lastSlash) : null;
  }

  async discoverEndpoints(): Promise<ToolVaultRootResponse> {
    try {
      // Get root endpoint to discover available endpoints
      const rootUrl = `${SERVER_BASE_URL}/`;
      
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
        this.toolsListUrl = `${SERVER_BASE_URL}${rootInfo.endpoints.tools}`;
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

  async listTools(): Promise<GlobalToolIndexModel> {
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

  async callTool(request: SPAToolCallRequest): Promise<ToolCallResponse> {
    try {
      // Transform arguments from object format to list format expected by server
      const transformedRequest = {
        name: request.name,
        arguments: Object.entries(request.arguments).map(([name, value]) => ({
          name,
          value
        }))
      };

      const response = await fetch(`${this.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedRequest),
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

  async loadToolIndex(toolName: string, indexPath?: string): Promise<ToolIndexModel> {
    // If indexPath is provided and starts with '/', it's a relative path - prepend SERVER_BASE_URL
    // Otherwise, use it as-is (absolute URL) or construct default path
    let path: string;
    if (indexPath) {
      path = indexPath.startsWith('/') ? `${SERVER_BASE_URL}${indexPath}` : indexPath;
    } else {
      path = `${SERVER_BASE_URL}/api/tools/${toolName}/tool.json`;
    }

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

  async loadSampleInput(inputPath: string, toolUrl?: string | null): Promise<Record<string, unknown>> {
    let url: string;
    if (inputPath.startsWith('http')) {
      url = inputPath;
    } else {
      const basePath = this.getToolBasePath(toolUrl);
      url = basePath ? `${SERVER_BASE_URL}${basePath}/${inputPath}` : inputPath;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load sample input: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading sample input from ${url}:`, error);
      throw error;
    }
  }

  async loadSchemaDocument(schemaPath: string, toolUrl?: string | null): Promise<unknown> {
    let url: string;
    if (schemaPath.startsWith('http')) {
      url = schemaPath;
    } else {
      const basePath = this.getToolBasePath(toolUrl);
      url = basePath ? `${SERVER_BASE_URL}${basePath}/${schemaPath}` : schemaPath;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load schema document: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading schema document from ${url}:`, error);
      throw error;
    }
  }

  async loadSourceCode(sourcePath: string, toolUrl?: string | null): Promise<string> {
    let url: string;
    if (sourcePath.startsWith('http')) {
      url = sourcePath;
    } else {
      const basePath = this.getToolBasePath(toolUrl);
      url = basePath ? `${SERVER_BASE_URL}${basePath}/${sourcePath}` : sourcePath;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load source code: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error loading source code from ${url}:`, error);
      throw error;
    }
  }

  async loadGitHistory(historyPath: string, toolUrl?: string | null): Promise<unknown> {
    let url: string;
    if (historyPath.startsWith('http')) {
      url = historyPath;
    } else {
      const basePath = this.getToolBasePath(toolUrl);
      url = basePath ? `${SERVER_BASE_URL}${basePath}/${historyPath}` : historyPath;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load git history: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading git history from ${url}:`, error);
      throw error;
    }
  }

}

export const mcpService = new MCPService();
