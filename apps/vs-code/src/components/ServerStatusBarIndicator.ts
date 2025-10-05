import * as vscode from 'vscode';
import { ServerState, SERVER_STATE_VISUALS } from '../types/ServerState';
import { ServerIndicatorConfig } from '../types/ServerIndicatorConfig';
import {
  isPortConflictError,
  isHealthCheckTimeoutError,
  PortConflictError,
  HealthCheckTimeoutError
} from '../types/ServerIndicatorErrors';
import { HealthCheckPoller } from '../services/HealthCheckPoller';
import { ServerLifecycleManager } from '../services/ServerLifecycleManager';

/**
 * Manages a single server status bar indicator with state-based visuals and actions.
 *
 * Displays server health status in VS Code status bar and provides QuickPick menu
 * for server control actions (start/stop/restart).
 *
 * @example
 * ```typescript
 * const config = createDebriefHttpConfig(...);
 * const indicator = new ServerStatusBarIndicator(config);
 * context.subscriptions.push(indicator);
 * ```
 */
export class ServerStatusBarIndicator implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: ServerState = ServerState.NotStarted;
  private poller: HealthCheckPoller | null = null;
  private lifecycleManager: ServerLifecycleManager;
  private commandId: string;

  /**
   * Creates a new ServerStatusBarIndicator.
   *
   * @param config - Server configuration with lifecycle callbacks
   * @param priority - Status bar item priority (default: 100)
   */
  constructor(
    private readonly config: ServerIndicatorConfig,
    priority = 100
  ) {
    this.lifecycleManager = new ServerLifecycleManager();

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      priority
    );

    // Generate unique command ID from server name
    this.commandId = `debrief.${config.name.toLowerCase().replace(/\s+/g, '-')}.showMenu`;

    // Register command for QuickPick menu
    vscode.commands.registerCommand(this.commandId, () => this.showMenu());

    // Set command and initial visuals
    this.statusBarItem.command = this.commandId;
    this.updateVisuals();
    this.statusBarItem.show();
  }

  /**
   * Updates status bar visuals based on current state.
   *
   * Applies icon, color, tooltip, and background color from SERVER_STATE_VISUALS.
   *
   * @private
   */
  private updateVisuals(): void {
    const visuals = SERVER_STATE_VISUALS[this.currentState];

    this.statusBarItem.text = `${visuals.icon} ${this.config.name}`;
    this.statusBarItem.tooltip = `${this.config.name}: ${visuals.tooltipSuffix}`;

    // Set foreground color if specified
    if (visuals.color) {
      this.statusBarItem.color = visuals.color;
    } else {
      this.statusBarItem.color = undefined;
    }

    // Set background color if specified (Error state)
    if (visuals.backgroundColor) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(visuals.backgroundColor);
    } else {
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Sets server state and updates visuals.
   *
   * Only updates if state actually changed to avoid unnecessary UI updates.
   *
   * @param newState - New server state
   * @private
   */
  private setState(newState: ServerState): void {
    if (this.currentState !== newState) {
      console.warn(`[Indicator] ${this.config.name} state: ${this.currentState} → ${newState}`);
      this.currentState = newState;
      this.updateVisuals();
    }
  }

  /**
   * Starts the server and begins health check polling.
   *
   * Transitions through Starting → Healthy states, or to Error on failure.
   * Uses fast polling (500ms) during startup, then switches to normal (5s).
   *
   * @throws {PortConflictError} If port is already in use
   * @throws {HealthCheckTimeoutError} If server doesn't become healthy within timeout
   */
  async start(): Promise<void> {
    try {
      this.setState(ServerState.Starting);

      // Start server
      await this.lifecycleManager.start(this.config);

      // Wait for healthy with startup polling (500ms, faster feedback)
      await this.lifecycleManager.waitForHealthy(this.config, 30000, 500);

      // Success - switch to normal polling
      this.setState(ServerState.Healthy);
      this.startNormalPolling();

    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Stops the server and health check polling.
   *
   * Transitions to NotStarted state. Never throws (idempotent operation).
   */
  async stop(): Promise<void> {
    this.stopPolling();
    await this.lifecycleManager.stop(this.config);
    this.setState(ServerState.NotStarted);
  }

  /**
   * Restarts the server with health check.
   *
   * Stops polling, restarts server, waits for healthy, then resumes polling.
   *
   * @throws {PortConflictError} If port is already in use
   * @throws {HealthCheckTimeoutError} If server doesn't become healthy within timeout
   */
  async restart(): Promise<void> {
    try {
      this.setState(ServerState.Starting);
      this.stopPolling();

      await this.lifecycleManager.restart(this.config);
      await this.lifecycleManager.waitForHealthy(this.config, 30000, 500);

      this.setState(ServerState.Healthy);
      this.startNormalPolling();

    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Starts normal health check polling (5 second interval).
   *
   * Creates poller that monitors server health and updates state on changes.
   * Uses consecutive failure detection (3 failures before Error state).
   *
   * @private
   */
  private startNormalPolling(): void {
    this.poller = new HealthCheckPoller(
      this.config.healthCheckUrl,
      this.config.pollInterval || 5000,
      (isHealthy) => {
        this.setState(isHealthy ? ServerState.Healthy : ServerState.Error);
      },
      3  // 3 consecutive failures before Error
    );
    this.poller.start();
  }

  /**
   * Stops health check polling and disposes poller.
   *
   * @private
   */
  private stopPolling(): void {
    if (this.poller) {
      this.poller.dispose();
      this.poller = null;
    }
  }

  /**
   * Handles errors during server operations.
   *
   * Shows appropriate error messages to user based on error type.
   * Always transitions to Error state.
   *
   * @param error - Error from server operation
   * @private
   */
  private handleError(error: unknown): void {
    if (isPortConflictError(error)) {
      this.handlePortConflictError(error as PortConflictError);
    } else if (isHealthCheckTimeoutError(error)) {
      this.handleHealthCheckTimeoutError(error as HealthCheckTimeoutError);
    } else {
      // Generic error
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to start ${this.config.name}: ${message}`,
        'Show Details'
      ).then(selection => {
        if (selection === 'Show Details' && this.config.onShowDetails) {
          this.config.onShowDetails();
        }
      });
    }

    this.setState(ServerState.Error);
  }

  /**
   * Handles port conflict errors with actionable UI.
   *
   * @param error - Port conflict error with port number
   * @private
   */
  private handlePortConflictError(error: PortConflictError): void {
    vscode.window.showErrorMessage(
      `Port ${error.port} is already in use for ${this.config.name}`,
      'Change Port',
      'Show Details'
    ).then(selection => {
      if (selection === 'Change Port') {
        // Open settings for Tool Vault (only server with configurable port)
        if (this.config.name === 'Tool Vault') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'debrief.toolVault.port');
        }
      } else if (selection === 'Show Details' && this.config.onShowDetails) {
        this.config.onShowDetails();
      }
    });
  }

  /**
   * Handles health check timeout errors.
   *
   * @param error - Health check timeout error with timeout duration
   * @private
   */
  private handleHealthCheckTimeoutError(error: HealthCheckTimeoutError): void {
    vscode.window.showErrorMessage(
      `${this.config.name} did not respond within ${error.timeoutMs / 1000}s. Check logs for details.`,
      'Show Logs',
      'Retry'
    ).then(selection => {
      if (selection === 'Show Logs' && this.config.onShowDetails) {
        this.config.onShowDetails();
      } else if (selection === 'Retry') {
        this.start();
      }
    });
  }

  /**
   * Shows QuickPick menu with state-appropriate actions.
   *
   * Menu options vary based on current server state:
   * - NotStarted: Start Server, Show Details
   * - Starting: Stop Server (cancel)
   * - Healthy: Stop, Restart, Open Web UI, Show Details
   * - Error: Restart, Stop, Show Details
   */
  async showMenu(): Promise<void> {
    const items: vscode.QuickPickItem[] = [];

    switch (this.currentState) {
      case ServerState.NotStarted:
        items.push({
          label: '$(play) Start Server',
          description: `Start ${this.config.name}`
        });
        break;

      case ServerState.Starting:
        items.push({
          label: '$(debug-stop) Stop Server',
          description: 'Cancel startup'
        });
        break;

      case ServerState.Healthy:
        items.push({
          label: '$(debug-stop) Stop Server',
          description: 'Stop the server'
        });
        items.push({
          label: '$(debug-restart) Restart Server',
          description: 'Restart the server'
        });
        if (this.config.onOpenWebUI) {
          items.push({
            label: '$(globe) Open Web UI',
            description: 'Open in browser'
          });
        }
        break;

      case ServerState.Error:
        items.push({
          label: '$(debug-restart) Restart Server',
          description: 'Try to recover'
        });
        items.push({
          label: '$(debug-stop) Stop Server',
          description: 'Stop the server'
        });
        break;
    }

    // Always add Show Details if callback exists
    if (this.config.onShowDetails) {
      items.push({
        label: '$(info) Show Details',
        description: 'Show server status'
      });
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `${this.config.name} - ${this.currentState}`
    });

    if (selected) {
      await this.handleMenuSelection(selected.label);
    }
  }

  /**
   * Handles QuickPick menu selection.
   *
   * Routes to appropriate action based on menu item label.
   *
   * @param label - Selected menu item label
   * @private
   */
  private async handleMenuSelection(label: string): Promise<void> {
    try {
      if (label.includes('Start Server')) {
        await this.start();
      } else if (label.includes('Stop Server')) {
        await this.stop();
      } else if (label.includes('Restart Server')) {
        await this.restart();
      } else if (label.includes('Open Web UI') && this.config.onOpenWebUI) {
        this.config.onOpenWebUI();
      } else if (label.includes('Show Details') && this.config.onShowDetails) {
        this.config.onShowDetails();
      }
    } catch (error) {
      console.error(`[Indicator] Error handling menu selection:`, error);
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Action failed: ${message}`);
    }
  }

  /**
   * Disposes the indicator and releases all resources.
   *
   * Stops polling and disposes status bar item.
   */
  dispose(): void {
    this.stopPolling();
    this.statusBarItem.dispose();
  }
}
