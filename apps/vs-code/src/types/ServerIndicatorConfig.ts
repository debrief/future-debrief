/**
 * Configuration interface for server status bar indicators.
 *
 * Defines the contract for creating a status bar indicator that monitors
 * server health and provides user controls for server lifecycle management.
 *
 * @example Debrief HTTP Server Configuration
 * ```typescript
 * const debriefConfig: ServerIndicatorConfig = {
 *   name: 'Debrief HTTP',
 *   healthCheckUrl: 'http://localhost:60123/health',
 *   pollInterval: 5000,
 *   onStart: async () => {
 *     const server = new DebriefHTTPServer();
 *     await server.start();
 *   },
 *   onStop: async () => {
 *     await debriefServer.stop();
 *   }
 * };
 * ```
 *
 * @example Tool Vault Server Configuration (with optional UI actions)
 * ```typescript
 * const toolVaultConfig: ServerIndicatorConfig = {
 *   name: 'Tool Vault',
 *   healthCheckUrl: 'http://localhost:60124/health',
 *   onStart: async () => {
 *     await ToolVaultServerService.getInstance().startServer();
 *   },
 *   onStop: async () => {
 *     await ToolVaultServerService.getInstance().stopServer();
 *   },
 *   onRestart: async () => {
 *     await ToolVaultServerService.getInstance().restartServer();
 *   },
 *   onOpenWebUI: () => {
 *     vscode.env.openExternal(vscode.Uri.parse('http://localhost:60124'));
 *   },
 *   onShowDetails: () => {
 *     vscode.commands.executeCommand('debrief.toolVaultStatus');
 *   }
 * };
 * ```
 */
export interface ServerIndicatorConfig {
  /**
   * Display name for the server shown in the status bar and tooltips.
   *
   * Should be concise and descriptive (2-3 words maximum).
   *
   * @example 'Debrief HTTP'
   * @example 'Tool Vault'
   * @example 'Plot Server'
   */
  name: string;

  /**
   * HTTP endpoint URL for server health checks.
   *
   * Must return 200 OK when server is healthy.
   * Recommended response format: `{ "status": "healthy" }`
   *
   * @example 'http://localhost:60123/health' - Debrief HTTP server
   * @example 'http://localhost:60124/health' - Tool Vault server
   */
  healthCheckUrl: string;

  /**
   * Health check polling interval in milliseconds.
   *
   * **Default**: 5000ms (5 seconds)
   *
   * **Performance Impact**:
   * - 5000ms: ~24 requests/min, <0.1% CPU (recommended)
   * - 1000ms: ~120 requests/min, ~0.5% CPU (high frequency)
   * - 10000ms: ~12 requests/min, <0.05% CPU (low frequency)
   *
   * @default 5000
   */
  pollInterval?: number;

  /**
   * Async callback to start the server.
   *
   * **REQUIRED** - Must be implemented for all server configurations.
   *
   * This callback is invoked when:
   * - User clicks "Start Server" in QuickPick menu
   * - Server transitions from NotStarted to Starting state
   *
   * **Implementation Requirements**:
   * - Must be async (return `Promise<void>`)
   * - Should throw error if startup fails (error is caught and displayed)
   * - Should be idempotent (safe to call multiple times)
   *
   * @throws {Error} If server startup fails (e.g., port conflict, missing dependencies)
   *
   * @example
   * ```typescript
   * onStart: async () => {
   *   if (!server) {
   *     server = new DebriefHTTPServer();
   *   }
   *   await server.start(); // May throw if port in use
   * }
   * ```
   */
  onStart: () => Promise<void>;

  /**
   * Async callback to stop the server.
   *
   * **REQUIRED** - Must be implemented for all server configurations.
   *
   * This callback is invoked when:
   * - User clicks "Stop Server" in QuickPick menu
   * - Extension is deactivating (cleanup)
   * - Before restart operation
   *
   * **Implementation Requirements**:
   * - Must be async (return `Promise<void>`)
   * - Should gracefully shutdown server (SIGTERM before SIGKILL)
   * - Should be idempotent (safe to call even if server not running)
   * - Should not throw errors (log failures instead)
   *
   * @example
   * ```typescript
   * onStop: async () => {
   *   if (server) {
   *     await server.stop();
   *     server = null;
   *   }
   * }
   * ```
   */
  onStop: () => Promise<void>;

  /**
   * Optional async callback to restart the server.
   *
   * **Default Behavior**: If not provided, restart will call `onStop()` then `onStart()`
   *
   * Provide a custom implementation if your server has an optimized restart method
   * (e.g., reload without full shutdown).
   *
   * @example Custom restart with existing method
   * ```typescript
   * onRestart: async () => {
   *   await ToolVaultServerService.getInstance().restartServer();
   * }
   * ```
   *
   * @example Default behavior (auto-generated if omitted)
   * ```typescript
   * onRestart: async () => {
   *   await this.onStop();
   *   await this.onStart();
   * }
   * ```
   */
  onRestart?: () => Promise<void>;

  /**
   * Optional callback to open the server's web UI in a browser.
   *
   * **Use Case**: Tool Vault server has a web interface on port 60124
   *
   * This callback is invoked when:
   * - User clicks "Open Web UI" in QuickPick menu (only shown if callback is defined)
   *
   * **Not applicable for**: Debrief HTTP server (no web UI, only API)
   *
   * @example
   * ```typescript
   * onOpenWebUI: () => {
   *   vscode.env.openExternal(vscode.Uri.parse('http://localhost:60124'));
   * }
   * ```
   */
  onOpenWebUI?: () => void;

  /**
   * Optional callback to show detailed server status information.
   *
   * This callback is invoked when:
   * - User clicks "Show Details" in QuickPick menu
   * - User wants to see extended server information (logs, config, etc.)
   *
   * **Recommended Implementation**: Show VS Code modal or open output channel
   *
   * @example Show status command
   * ```typescript
   * onShowDetails: () => {
   *   vscode.commands.executeCommand('debrief.toolVaultStatus');
   * }
   * ```
   *
   * @example Show output channel
   * ```typescript
   * onShowDetails: () => {
   *   outputChannel.show();
   * }
   * ```
   */
  onShowDetails?: () => void;
}

/**
 * Type guard to validate ServerIndicatorConfig at runtime.
 *
 * Checks that all required properties exist and have correct types.
 * Does NOT validate optional properties if they are undefined.
 *
 * @param obj - Object to validate
 * @returns True if object is a valid ServerIndicatorConfig
 *
 * @example
 * ```typescript
 * function createIndicator(config: unknown) {
 *   if (!isValidServerIndicatorConfig(config)) {
 *     throw new Error('Invalid server indicator configuration');
 *   }
 *   // TypeScript now knows config is ServerIndicatorConfig
 *   return new ServerStatusBarIndicator(config);
 * }
 * ```
 */
export function isValidServerIndicatorConfig(
  obj: unknown
): obj is ServerIndicatorConfig {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const config = obj as Record<string, unknown>;

  // Check required string properties
  if (typeof config.name !== 'string' || config.name.trim().length === 0) {
    return false;
  }

  if (typeof config.healthCheckUrl !== 'string' || !config.healthCheckUrl.startsWith('http')) {
    return false;
  }

  // Check required async callbacks
  if (typeof config.onStart !== 'function') {
    return false;
  }

  if (typeof config.onStop !== 'function') {
    return false;
  }

  // Check optional properties only if they exist
  if ('pollInterval' in config && typeof config.pollInterval !== 'number') {
    return false;
  }

  if ('onRestart' in config && typeof config.onRestart !== 'function') {
    return false;
  }

  if ('onOpenWebUI' in config && typeof config.onOpenWebUI !== 'function') {
    return false;
  }

  if ('onShowDetails' in config && typeof config.onShowDetails !== 'function') {
    return false;
  }

  return true;
}

/**
 * Validates that a ServerIndicatorConfig has a valid poll interval.
 *
 * Ensures poll interval is within acceptable bounds to prevent performance issues.
 *
 * @param config - Configuration to validate
 * @returns True if poll interval is valid or uses default
 *
 * @example
 * ```typescript
 * if (!hasValidPollInterval(config)) {
 *   console.warn(`Poll interval ${config.pollInterval}ms is outside recommended range (1000-30000ms)`);
 * }
 * ```
 */
export function hasValidPollInterval(config: ServerIndicatorConfig): boolean {
  const interval = config.pollInterval ?? 5000;
  return interval >= 1000 && interval <= 30000;
}
