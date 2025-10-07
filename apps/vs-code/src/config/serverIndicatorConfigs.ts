import * as vscode from 'vscode';
import { ServerIndicatorConfig } from '../types/ServerIndicatorConfig';
import { DebriefHTTPServer } from '../services/debriefHttpServer';
import { ToolVaultServerService } from '../services/toolVaultServer';

/**
 * Creates configuration for Debrief HTTP Server status indicator.
 *
 * The Debrief HTTP server provides WebSocket/HTTP bridge for Python integration
 * on port 60123. It runs as a direct JavaScript process within the extension.
 *
 * @param serverInstance - Shared reference to DebriefHTTPServer instance (can be null)
 * @returns ServerIndicatorConfig for Debrief HTTP server
 *
 * @example
 * ```typescript
 * let httpServer: DebriefHTTPServer | null = null;
 * const config = createDebriefHttpConfig(() => httpServer, (s) => { httpServer = s; });
 * ```
 */
export function createDebriefHttpConfig(
  getServer: () => DebriefHTTPServer | null,
  setServer: (server: DebriefHTTPServer | null) => void
): ServerIndicatorConfig {
  return {
    name: 'Debrief State',
    healthCheckUrl: 'http://localhost:60123/health',
    pollInterval: 5000,

    onStart: async () => {
      let server = getServer();
      if (!server) {
        server = new DebriefHTTPServer();
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
    // No onOpenWebUI - Debrief HTTP has no web interface
    // No onShowDetails - could add output channel in future
  };
}

/**
 * Creates configuration for Tool Vault Server status indicator.
 *
 * The Tool Vault server provides MCP-compatible REST API for Python tools
 * on port 60124. It runs as a Python subprocess managed by ToolVaultServerService.
 *
 * @returns ServerIndicatorConfig for Tool Vault server
 *
 * @example
 * ```typescript
 * const config = createToolVaultConfig();
 * ```
 */
export function createToolVaultConfig(): ServerIndicatorConfig {
  return {
    name: 'Tool Vault',
    healthCheckUrl: 'http://localhost:60124/health',
    pollInterval: 5000,

    onStart: async () => {
      const service = ToolVaultServerService.getInstance();
      await service.startServer();
    },

    onStop: async () => {
      const service = ToolVaultServerService.getInstance();
      await service.stopServer();
    },

    onRestart: async () => {
      const service = ToolVaultServerService.getInstance();
      await service.restartServer();
    },

    onOpenWebUI: () => {
      // Open Tool Vault web interface in external browser
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:60124/ui'));
    },

    onShowDetails: () => {
      // Show existing Tool Vault status command
      vscode.commands.executeCommand('debrief.toolVaultStatus');
    }
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
