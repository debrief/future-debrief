import { ServerIndicatorConfig } from '../types/ServerIndicatorConfig';
import {
  ServerStartupError,
  PortConflictError,
  ServerCallbackError,
  HealthCheckTimeoutError
} from '../types/ServerIndicatorErrors';

/**
 * Manages server lifecycle operations with error handling.
 *
 * Wraps server start/stop/restart callbacks with proper error detection
 * and type-specific error throwing for better error handling upstream.
 *
 * @example
 * ```typescript
 * const manager = new ServerLifecycleManager();
 *
 * try {
 *   await manager.start(config);
 * } catch (error) {
 *   if (error instanceof PortConflictError) {
 *     console.error(`Port ${error.port} is in use`);
 *   }
 * }
 * ```
 */
export class ServerLifecycleManager {
  /**
   * Starts a server using the provided configuration.
   *
   * Invokes the onStart callback and handles errors appropriately:
   * - EADDRINUSE errors become PortConflictError
   * - Other errors become ServerStartupError
   * - All errors include server name for context
   *
   * @param config - Server configuration with onStart callback
   * @throws {PortConflictError} If port is already in use
   * @throws {ServerStartupError} If startup fails for other reasons
   * @throws {ServerCallbackError} If callback itself throws unexpected error
   */
  async start(config: ServerIndicatorConfig): Promise<void> {
    try {
      console.warn(`[Lifecycle] Starting ${config.name}...`);
      await config.onStart();
      console.warn(`[Lifecycle] ${config.name} started successfully`);
    } catch (error) {
      // Detect port conflict errors
      if (this.isPortConflictError(error)) {
        const port = this.extractPortFromUrl(config.healthCheckUrl);
        console.error(`[Lifecycle] ${config.name} port conflict on ${port}`);
        throw new PortConflictError(config.name, port);
      }

      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Lifecycle] ${config.name} startup failed: ${errorMessage}`);
      throw new ServerStartupError(config.name, errorMessage);
    }
  }

  /**
   * Stops a server using the provided configuration.
   *
   * Invokes the onStop callback. Logs errors but does not throw -
   * stop operations should be idempotent and not fail.
   *
   * @param config - Server configuration with onStop callback
   */
  async stop(config: ServerIndicatorConfig): Promise<void> {
    try {
      console.warn(`[Lifecycle] Stopping ${config.name}...`);
      await config.onStop();
      console.warn(`[Lifecycle] ${config.name} stopped successfully`);
    } catch (error) {
      // Log but don't throw - stop should be tolerant
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Lifecycle] Failed to stop ${config.name}: ${errorMessage}`);
    }
  }

  /**
   * Restarts a server using the provided configuration.
   *
   * If config provides onRestart callback, uses that.
   * Otherwise, performs stop-then-start sequence with delay for port release.
   *
   * @param config - Server configuration with optional onRestart callback
   * @throws {PortConflictError} If port is already in use during restart
   * @throws {ServerStartupError} If restart fails
   */
  async restart(config: ServerIndicatorConfig): Promise<void> {
    if (config.onRestart) {
      // Use custom restart if provided
      try {
        console.warn(`[Lifecycle] Restarting ${config.name} (custom method)...`);
        await config.onRestart();
        console.warn(`[Lifecycle] ${config.name} restarted successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Lifecycle] ${config.name} restart failed: ${errorMessage}`);
        throw new ServerCallbackError(
          config.name,
          'onRestart',
          error instanceof Error ? error : new Error(errorMessage)
        );
      }
    } else {
      // Default: stop then start with delay
      console.warn(`[Lifecycle] Restarting ${config.name} (stop-then-start)...`);
      await this.stop(config);

      // Wait for port to be released (especially important for subprocess servers)
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.start(config);
    }
  }

  /**
   * Waits for a server to become healthy with timeout.
   *
   * Polls the health check endpoint until it returns success or timeout is reached.
   *
   * @param config - Server configuration with healthCheckUrl
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   * @param pollIntervalMs - Health check interval during startup (default: 500)
   * @throws {HealthCheckTimeoutError} If server doesn't become healthy within timeout
   */
  async waitForHealthy(
    config: ServerIndicatorConfig,
    timeoutMs = 30000,
    pollIntervalMs = 500
  ): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < timeoutMs) {
      attempts++;

      try {
        // Create AbortController with timeout to prevent fetch from hanging indefinitely
        // Critical: Without this, a fetch that never completes would block the timeout check
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), pollIntervalMs);

        const response = await fetch(config.healthCheckUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });

        clearTimeout(fetchTimeout);

        if (response.ok) {
          console.warn(`[Lifecycle] ${config.name} became healthy after ${attempts} attempts`);
          return;
        }
      } catch {
        // Ignore errors during startup - server may not be ready yet
        // Errors include: network failures, timeouts (AbortError), non-200 responses
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout reached
    console.error(`[Lifecycle] ${config.name} health check timeout after ${timeoutMs}ms`);
    throw new HealthCheckTimeoutError(config.name, timeoutMs);
  }

  /**
   * Checks if an error is a port conflict error.
   *
   * Detects EADDRINUSE errors from both Node.js and system errors.
   *
   * @param error - Error to check
   * @returns True if error indicates port conflict
   * @private
   */
  private isPortConflictError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: string }).code === 'EADDRINUSE';
    }

    // Also check error message for port conflict indicators
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      errorMessage.includes('EADDRINUSE') ||
      errorMessage.includes('address already in use') ||
      errorMessage.includes('port') && errorMessage.includes('already in use')
    );
  }

  /**
   * Extracts port number from health check URL.
   *
   * @param healthCheckUrl - Health check endpoint URL
   * @returns Port number, or 0 if not found
   * @private
   */
  private extractPortFromUrl(healthCheckUrl: string): number {
    const match = healthCheckUrl.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
