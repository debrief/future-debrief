/**
 * Health check polling service for server status monitoring.
 *
 * Continuously polls a health check endpoint to determine server health status.
 * Implements consecutive failure detection and proper resource cleanup.
 *
 * @example
 * ```typescript
 * const poller = new HealthCheckPoller(
 *   'http://localhost:60123/health',
 *   5000,
 *   (isHealthy) => {
 *     console.warn(`Server health changed: ${isHealthy}`);
 *   }
 * );
 *
 * poller.start();
 * // ... later
 * poller.dispose();
 * ```
 */
export class HealthCheckPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private consecutiveFailures = 0;
  private isRunning = false;

  /**
   * Creates a new HealthCheckPoller instance.
   *
   * @param url - Health check endpoint URL
   * @param interval - Polling interval in milliseconds (default: 5000)
   * @param onHealthChange - Callback invoked when health status changes
   * @param failureThreshold - Number of consecutive failures before reporting unhealthy (default: 3)
   */
  constructor(
    private readonly url: string,
    private readonly interval = 5000,
    private readonly onHealthChange: (isHealthy: boolean) => void,
    private readonly failureThreshold = 3
  ) {}

  /**
   * Starts health check polling.
   *
   * Polls the health check endpoint at the configured interval.
   * Calls onHealthChange callback when health status changes.
   *
   * @throws {Error} If polling is already running
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('HealthCheckPoller is already running');
    }

    this.isRunning = true;
    this.consecutiveFailures = 0;

    // Perform immediate health check
    this.checkHealth();

    // Start periodic polling
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, this.interval);
  }

  /**
   * Stops health check polling without cleanup.
   *
   * Use this to temporarily pause polling. Call start() to resume.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.isRunning = false;
  }

  /**
   * Disposes the poller and releases all resources.
   *
   * This method should be called when the poller is no longer needed.
   * After disposal, the poller cannot be restarted.
   */
  dispose(): void {
    this.stop();
    this.consecutiveFailures = 0;
  }

  /**
   * Performs a single health check.
   *
   * @private
   */
  private async checkHealth(): Promise<void> {
    // Abort any in-flight request
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(this.url, {
        signal: this.abortController.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        // Health check successful
        if (this.consecutiveFailures > 0) {
          // Server recovered - health status changed
          this.consecutiveFailures = 0;
          this.onHealthChange(true);
        } else if (this.consecutiveFailures === 0) {
          // First successful check or still healthy
          this.onHealthChange(true);
        }
      } else {
        // Health check failed with HTTP error
        this.handleFailure(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Handle network errors, timeouts, aborts
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted intentionally - don't count as failure
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleFailure(errorMessage);
    }
  }

  /**
   * Handles a health check failure.
   *
   * Increments consecutive failure counter and reports unhealthy status
   * if threshold is reached.
   *
   * @param reason - Reason for failure (for logging)
   * @private
   */
  private handleFailure(reason: string): void {
    this.consecutiveFailures++;

    console.warn(
      `[HealthCheck] ${this.url} failed (${this.consecutiveFailures}/${this.failureThreshold}): ${reason}`
    );

    if (this.consecutiveFailures >= this.failureThreshold) {
      // Threshold reached - report unhealthy
      this.onHealthChange(false);
    }
  }

  /**
   * Gets the current number of consecutive failures.
   *
   * Useful for testing and debugging.
   *
   * @returns Number of consecutive failures
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Checks if the poller is currently running.
   *
   * @returns True if polling is active
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}
