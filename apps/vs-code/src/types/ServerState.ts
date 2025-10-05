/**
 * Server state enumeration for status bar indicators.
 *
 * Represents the lifecycle states of a server (Debrief HTTP or Tool Vault)
 * with corresponding visual indicators for the VS Code status bar.
 *
 * State Transition Flow:
 * ```
 * NotStarted → Starting → Healthy ↔ Error
 *                ↓           ↓
 *            Error ← ────────┘
 * ```
 *
 * @see {@link SERVER_STATE_VISUALS} for icon and color mappings
 * @see .claude/task-context/issue-215/decisions.md Section 3 for state machine design
 */
export enum ServerState {
  /**
   * Server has not been started yet.
   * - Visual: Gray $(server) icon
   * - User Action: Click to start server
   */
  NotStarted = 'not_started',

  /**
   * Server is in the process of starting up.
   * - Visual: Yellow $(sync~spin) animated icon
   * - Timeout: 30 seconds before transitioning to Error
   * - Health Check: Polling every 500ms during startup
   */
  Starting = 'starting',

  /**
   * Server is running and healthy.
   * - Visual: Green $(check) icon
   * - Health Check: Polling every 5 seconds
   * - Transition to Error: After 3 consecutive health check failures
   */
  Healthy = 'healthy',

  /**
   * Server has encountered an error or is not responding.
   * - Visual: Red background $(error) icon
   * - User Action: Click to view error details and recovery options
   * - Auto-Recovery: May retry if configured
   */
  Error = 'error'
}

/**
 * Visual configuration for a server state.
 *
 * Defines how a server state should be displayed in the VS Code status bar,
 * including icon, color, and tooltip text.
 */
export interface StateVisuals {
  /**
   * VS Code codicon name for the status bar item.
   *
   * Format: `$(icon-name)` or `$(icon-name~modifier)` for animations
   *
   * @example '$(server)' - Static server icon
   * @example '$(sync~spin)' - Spinning sync icon (for Starting state)
   * @see https://code.visualstudio.com/api/references/icons-in-labels
   */
  icon: string;

  /**
   * Optional foreground color for the status bar text.
   *
   * Can be a hex color or VS Code theme color.
   *
   * @example '#858585' - Gray for NotStarted state
   * @example '#00FF00' - Green for Healthy state
   */
  color?: string;

  /**
   * Optional background color for the status bar item.
   *
   * **IMPORTANT**: VS Code only supports two background colors:
   * - `statusBarItem.errorBackground` (red)
   * - `statusBarItem.warningBackground` (yellow/orange)
   *
   * @example 'statusBarItem.errorBackground' - For Error state
   */
  backgroundColor?: string;

  /**
   * Text appended to server name in tooltip.
   *
   * Full tooltip format: `{serverName}: {tooltipSuffix}`
   *
   * @example 'Not Started - Click to start' → "Debrief HTTP: Not Started - Click to start"
   * @example 'Healthy - Port 60123' → "Tool Vault: Healthy - Port 60124"
   */
  tooltipSuffix?: string;
}

/**
 * Mapping type from ServerState to visual configuration.
 *
 * Ensures every ServerState enum value has a corresponding visual definition.
 */
export type StateVisualsMap = {
  [key in ServerState]: StateVisuals;
};

/**
 * Visual configurations for all server states.
 *
 * This constant defines the appearance of each server state in the status bar:
 * - Icons use VS Code's built-in codicon set
 * - Colors are hex values for cross-theme compatibility
 * - Background colors use theme-aware VS Code constants
 *
 * @example
 * ```typescript
 * const visuals = SERVER_STATE_VISUALS[ServerState.Healthy];
 * statusBarItem.text = visuals.icon + ' Server Name';
 * statusBarItem.color = visuals.color;
 * ```
 */
export const SERVER_STATE_VISUALS: StateVisualsMap = {
  [ServerState.NotStarted]: {
    icon: '$(server)',
    color: '#858585',
    tooltipSuffix: 'Not Started - Click to start'
  },
  [ServerState.Starting]: {
    icon: '$(sync~spin)',
    color: '#FFA500',
    tooltipSuffix: 'Starting...'
  },
  [ServerState.Healthy]: {
    icon: '$(check)',
    color: '#00FF00',
    tooltipSuffix: 'Healthy'
  },
  [ServerState.Error]: {
    icon: '$(error)',
    backgroundColor: 'statusBarItem.errorBackground',
    tooltipSuffix: 'Error - Click for details'
  }
};

/**
 * Type guard to check if a value is a valid ServerState.
 *
 * Useful for runtime validation of state values from external sources
 * or when deserializing state from storage.
 *
 * @param value - Value to check
 * @returns True if value is a valid ServerState enum member
 *
 * @example
 * ```typescript
 * const stateFromStorage: unknown = localStorage.getItem('serverState');
 * if (isServerState(stateFromStorage)) {
 *   // TypeScript now knows stateFromStorage is ServerState
 *   const visuals = SERVER_STATE_VISUALS[stateFromStorage];
 * }
 * ```
 */
export function isServerState(value: unknown): value is ServerState {
  return (
    typeof value === 'string' &&
    Object.values(ServerState).includes(value as ServerState)
  );
}
