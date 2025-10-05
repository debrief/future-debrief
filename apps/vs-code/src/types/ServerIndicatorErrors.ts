import { ServerState } from './ServerState';

/**
 * Base error class for all server indicator-related errors.
 *
 * Extends the standard Error class with server-specific context:
 * - Server name (for multi-server scenarios)
 * - Current server state (for state-aware error handling)
 *
 * All server indicator errors should extend this base class for
 * consistent error handling and logging.
 *
 * @example
 * ```typescript
 * try {
 *   await startServer();
 * } catch (error) {
 *   if (error instanceof ServerIndicatorError) {
 *     console.error(`Server ${error.serverName} failed in ${error.state} state: ${error.message}`);
 *   }
 * }
 * ```
 */
export class ServerIndicatorError extends Error {
  /**
   * Creates a new ServerIndicatorError.
   *
   * @param message - Human-readable error description
   * @param serverName - Name of the server that encountered the error (e.g., "Debrief HTTP", "Tool Vault")
   * @param state - Server state when error occurred (used for state-aware recovery)
   */
  constructor(
    message: string,
    public readonly serverName: string,
    public readonly state: ServerState
  ) {
    super(message);
    this.name = 'ServerIndicatorError';
    // Maintains proper stack trace for where error was thrown (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerIndicatorError);
    }
  }
}

/**
 * Error thrown when server health check times out.
 *
 * Indicates that the server failed to respond to health check requests
 * within the configured timeout period (typically 30 seconds during startup).
 *
 * **Recovery Strategy**:
 * - Check if server process is running
 * - Verify health check endpoint is correct
 * - Check for network/firewall issues
 * - Increase timeout if server requires longer startup
 *
 * @example
 * ```typescript
 * try {
 *   await waitForServerReady(30000); // 30 second timeout
 * } catch (error) {
 *   throw new HealthCheckTimeoutError('Debrief HTTP');
 * }
 * ```
 */
export class HealthCheckTimeoutError extends ServerIndicatorError {
  /**
   * Creates a HealthCheckTimeoutError.
   *
   * @param serverName - Name of the server that timed out
   * @param timeoutMs - Timeout duration in milliseconds (for error message)
   */
  constructor(serverName: string, public readonly timeoutMs = 30000) {
    super(
      `Health check timeout for ${serverName} after ${timeoutMs}ms. Server may not be responding.`,
      serverName,
      ServerState.Error
    );
    this.name = 'HealthCheckTimeoutError';
  }
}

/**
 * Error thrown when server fails to start.
 *
 * Captures the underlying cause of server startup failure for debugging.
 *
 * **Common Causes**:
 * - Port already in use (see {@link PortConflictError})
 * - Missing dependencies or configuration
 * - Insufficient permissions
 * - Invalid server executable path
 *
 * @example
 * ```typescript
 * try {
 *   await server.start();
 * } catch (error) {
 *   throw new ServerStartupError(
 *     'Tool Vault',
 *     error instanceof Error ? error.message : String(error)
 *   );
 * }
 * ```
 */
export class ServerStartupError extends ServerIndicatorError {
  /**
   * Creates a ServerStartupError.
   *
   * @param serverName - Name of the server that failed to start
   * @param cause - Underlying error message or description
   */
  constructor(serverName: string, public readonly cause: string) {
    super(
      `Failed to start ${serverName}: ${cause}`,
      serverName,
      ServerState.Error
    );
    this.name = 'ServerStartupError';
  }
}

/**
 * Error thrown when server port is already in use.
 *
 * Specific type of startup error indicating port conflict.
 *
 * **Recovery Strategies**:
 * 1. Stop the process using the port
 * 2. Change server configuration to use different port
 * 3. Reconnect to existing server if it's the same application
 *
 * @example Port conflict detection
 * ```typescript
 * try {
 *   await server.start();
 * } catch (error) {
 *   if (error.code === 'EADDRINUSE') {
 *     throw new PortConflictError('Debrief HTTP', 60123);
 *   }
 * }
 * ```
 */
export class PortConflictError extends ServerIndicatorError {
  /**
   * Creates a PortConflictError.
   *
   * @param serverName - Name of the server that encountered port conflict
   * @param port - Port number that is already in use
   */
  constructor(serverName: string, public readonly port: number) {
    super(
      `Port ${port} is already in use for ${serverName}. Another process may be using this port.`,
      serverName,
      ServerState.Error
    );
    this.name = 'PortConflictError';
  }
}

/**
 * Error thrown when server health check fails unexpectedly.
 *
 * Different from {@link HealthCheckTimeoutError} - this indicates the health check
 * received a response, but the response was not successful (non-200 status or error).
 *
 * **Common Scenarios**:
 * - Server returned 500 Internal Server Error
 * - Server returned 503 Service Unavailable
 * - Server returned malformed health check response
 * - Network error (ECONNREFUSED, ECONNRESET)
 *
 * @example
 * ```typescript
 * const response = await fetch(healthCheckUrl);
 * if (!response.ok) {
 *   throw new HealthCheckFailureError(
 *     'Tool Vault',
 *     `HTTP ${response.status}: ${response.statusText}`
 *   );
 * }
 * ```
 */
export class HealthCheckFailureError extends ServerIndicatorError {
  /**
   * Creates a HealthCheckFailureError.
   *
   * @param serverName - Name of the server with failed health check
   * @param reason - Specific reason for health check failure
   */
  constructor(serverName: string, public readonly reason: string) {
    super(
      `Health check failed for ${serverName}: ${reason}`,
      serverName,
      ServerState.Error
    );
    this.name = 'HealthCheckFailureError';
  }
}

/**
 * Error thrown when server lifecycle callback throws an error.
 *
 * Wraps errors from user-provided callbacks (onStart, onStop, onRestart)
 * to provide better context and prevent callback errors from crashing the extension.
 *
 * @example
 * ```typescript
 * try {
 *   await config.onStart();
 * } catch (error) {
 *   throw new ServerCallbackError(
 *     'Debrief HTTP',
 *     'onStart',
 *     error instanceof Error ? error : new Error(String(error))
 *   );
 * }
 * ```
 */
export class ServerCallbackError extends ServerIndicatorError {
  /**
   * Creates a ServerCallbackError.
   *
   * @param serverName - Name of the server whose callback failed
   * @param callbackName - Name of the callback that failed ('onStart', 'onStop', etc.)
   * @param originalError - The original error thrown by the callback
   */
  constructor(
    serverName: string,
    public readonly callbackName: string,
    public readonly originalError: Error
  ) {
    super(
      `Server callback '${callbackName}' failed for ${serverName}: ${originalError.message}`,
      serverName,
      ServerState.Error
    );
    this.name = 'ServerCallbackError';
  }
}

/**
 * Type guard to check if an error is a ServerIndicatorError.
 *
 * @param error - Error to check
 * @returns True if error is a ServerIndicatorError or subclass
 *
 * @example
 * ```typescript
 * catch (error) {
 *   if (isServerIndicatorError(error)) {
 *     // TypeScript knows error has serverName and state properties
 *     console.error(`Server ${error.serverName} error:`, error.message);
 *     statusBar.updateState(error.state);
 *   }
 * }
 * ```
 */
export function isServerIndicatorError(error: unknown): error is ServerIndicatorError {
  return error instanceof ServerIndicatorError;
}

/**
 * Type guard to check if an error is a PortConflictError.
 *
 * @param error - Error to check
 * @returns True if error is a PortConflictError
 *
 * @example
 * ```typescript
 * catch (error) {
 *   if (isPortConflictError(error)) {
 *     vscode.window.showErrorMessage(
 *       `Port ${error.port} is in use. Change port in settings?`,
 *       'Open Settings'
 *     );
 *   }
 * }
 * ```
 */
export function isPortConflictError(error: unknown): error is PortConflictError {
  return error instanceof PortConflictError;
}

/**
 * Type guard to check if an error is a HealthCheckTimeoutError.
 *
 * @param error - Error to check
 * @returns True if error is a HealthCheckTimeoutError
 *
 * @example
 * ```typescript
 * catch (error) {
 *   if (isHealthCheckTimeoutError(error)) {
 *     vscode.window.showErrorMessage(
 *       `Server did not start within ${error.timeoutMs / 1000}s`
 *     );
 *   }
 * }
 * ```
 */
export function isHealthCheckTimeoutError(error: unknown): error is HealthCheckTimeoutError {
  return error instanceof HealthCheckTimeoutError;
}
