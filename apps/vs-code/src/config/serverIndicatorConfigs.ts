import * as vscode from 'vscode';
import { ServerIndicatorConfig } from '../types/ServerIndicatorConfig';
import { DebriefMcpServer } from '../services/debriefMcpServer';

/**
 * Creates configuration for Debrief MCP Server status indicator.
 *
 * The Debrief MCP server provides Model Context Protocol API for Python integration
 * on port 60123. It runs as a direct JavaScript process within the extension.
 *
 * @param serverInstance - Shared reference to DebriefMcpServer instance (can be null)
 * @returns ServerIndicatorConfig for Debrief MCP server
 *
 * @example
 * ```typescript
 * let mcpServer: DebriefMcpServer | null = null;
 * const config = createDebriefHttpConfig(() => mcpServer, (s) => { mcpServer = s; });
 * ```
 */
export function createDebriefHttpConfig(
  getServer: () => DebriefMcpServer | null,
  setServer: (server: DebriefMcpServer | null) => void
): ServerIndicatorConfig {
  return {
    name: 'Debrief State',
    healthCheckUrl: 'http://localhost:60123/health',
    pollInterval: 5000,

    onStart: async () => {
      let server = getServer();
      if (!server) {
        server = new DebriefMcpServer();
        setServer(server);
      }
      await server.start();
    },

    onStop: async () => {
      const server = getServer();
      if (server) {
        await server.stop();
        setServer(null);
      }
    }

    // No onRestart - will use default stop-then-start
    // No onOpenWebUI - Debrief MCP has no web interface
    // No onShowDetails - could add output channel in future
  };
}

/**
 * Validates server configurations at runtime.
 *
 * Useful for ensuring configurations are correct during development.
 *
 * @param configs - Array of server configurations to validate
 * @throws {Error} If any configuration is invalid
 */
export function validateConfigurations(configs: ServerIndicatorConfig[]): void {
  for (const config of configs) {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Server configuration missing name');
    }

    if (!config.healthCheckUrl || !config.healthCheckUrl.startsWith('http')) {
      throw new Error(`Invalid healthCheckUrl for ${config.name}`);
    }

    if (typeof config.onStart !== 'function') {
      throw new Error(`Missing onStart callback for ${config.name}`);
    }

    if (typeof config.onStop !== 'function') {
      throw new Error(`Missing onStop callback for ${config.name}`);
    }

    console.warn(`[Config] Validated configuration for ${config.name}`);
  }
}
