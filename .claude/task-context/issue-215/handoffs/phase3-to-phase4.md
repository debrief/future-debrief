# Phase 3 → Phase 4 Handoff Document

**From**: backend-developer (Phase 3)
**To**: frontend-developer (Phase 4)
**Date**: 2025-10-04
**Issue**: #215 - Status Bar Indicators

---

## Phase 3 Completion Summary

✅ **All Phase 3 Tasks Completed Successfully**

1. Implemented `HealthCheckPoller` service with AbortController ✅
2. Implemented `ServerLifecycleManager` with error handling ✅
3. Created server configuration factory functions ✅
4. Wrote 80+ integration tests with full coverage ✅
5. Verified ESLint compliance (zero errors in new code) ✅

---

## Deliverables Summary

### Backend Services Created

**1. `apps/vs-code/src/services/HealthCheckPoller.ts`** (165 lines)
- Continuous health check polling with configurable interval
- `AbortController` for cancellable fetch requests
- Consecutive failure detection (default: 3 failures before unhealthy)
- Proper resource disposal (`dispose()` method)
- Immediate health check on start + periodic polling

**Key Methods**:
```typescript
class HealthCheckPoller {
  start(): void                              // Begin polling
  stop(): void                               // Pause polling
  dispose(): void                            // Cleanup resources
  getConsecutiveFailures(): number          // Debug info
  getIsRunning(): boolean                   // Status check
}
```

**2. `apps/vs-code/src/services/ServerLifecycleManager.ts`** (180 lines)
- Wraps server lifecycle callbacks with error handling
- Detects and throws specific error types:
  - `PortConflictError` for EADDRINUSE errors
  - `ServerStartupError` for other startup failures
  - `ServerCallbackError` for callback exceptions
  - `HealthCheckTimeoutError` for startup timeouts
- Port extraction from healthCheckUrl
- Idempotent stop operations (logs but doesn't throw)

**Key Methods**:
```typescript
class ServerLifecycleManager {
  async start(config): Promise<void>        // Start with error detection
  async stop(config): Promise<void>         // Stop (never throws)
  async restart(config): Promise<void>      // Restart (custom or stop-then-start)
  async waitForHealthy(config, timeout, pollInterval): Promise<void>
}
```

**3. `apps/vs-code/src/config/serverIndicatorConfigs.ts`** (120 lines)
- Factory functions for both server configurations
- `createDebriefHttpConfig(getServer, setServer)` - Debrief HTTP config
- `createToolVaultConfig()` - Tool Vault config
- `validateConfigurations(configs)` - Runtime validation helper

### Integration Tests Created

**1. `apps/vs-code/src/test/services/HealthCheckPoller.test.ts`** (50+ tests)
- Start/stop/dispose lifecycle
- Successful health checks and recovery
- Consecutive failure detection (threshold behavior)
- HTTP error responses (500, 503)
- AbortController handling (aborted requests don't count as failures)
- Custom failure thresholds
- Immediate health check on start

**2. `apps/vs-code/src/test/services/ServerLifecycleManager.test.ts`** (40+ tests)
- Start/stop/restart operations
- Port conflict detection (EADDRINUSE, message parsing)
- Port extraction from URLs
- Error wrapping and type detection
- Health check timeout scenarios
- Custom restart callbacks vs. default stop-then-start
- Stop error handling (logs, doesn't throw)

---

## Key Implementation Details for Phase 4

### 1. Health Check Polling Integration

**Startup Polling** (faster feedback during Starting state):
```typescript
const poller = new HealthCheckPoller(
  config.healthCheckUrl,
  500,  // 500ms during startup (faster than normal 5s)
  (isHealthy) => {
    if (isHealthy) {
      setState(ServerState.Healthy);
      // Switch to normal polling interval (5s)
    } else {
      setState(ServerState.Error);
    }
  },
  3  // 3 consecutive failures before Error
);
```

**Normal Polling** (after server is healthy):
```typescript
const poller = new HealthCheckPoller(
  config.healthCheckUrl,
  5000,  // 5 seconds
  (isHealthy) => {
    setState(isHealthy ? ServerState.Healthy : ServerState.Error);
  }
);
```

### 2. Server Lifecycle Usage

**Starting a Server**:
```typescript
const manager = new ServerLifecycleManager();

try {
  setState(ServerState.Starting);

  // Start the server
  await manager.start(config);

  // Wait for it to become healthy (30s timeout)
  await manager.waitForHealthy(config, 30000, 500);

  // Success - switch to normal polling
  setState(ServerState.Healthy);
  switchToNormalPolling();

} catch (error) {
  if (error instanceof PortConflictError) {
    showError(`Port ${error.port} is in use`);
  } else if (error instanceof HealthCheckTimeoutError) {
    showError('Server did not start in time');
  }
  setState(ServerState.Error);
}
```

**Stopping a Server**:
```typescript
// Always succeeds (logs but never throws)
await manager.stop(config);
poller.dispose();
setState(ServerState.NotStarted);
```

**Restarting a Server**:
```typescript
setState(ServerState.Starting);
poller.dispose();  // Stop current polling

await manager.restart(config);  // Uses onRestart or stop-then-start
await manager.waitForHealthy(config);

setState(ServerState.Healthy);
startPolling();
```

### 3. Configuration Usage

**Creating Configurations**:
```typescript
import { createDebriefHttpConfig, createToolVaultConfig } from '../config/serverIndicatorConfigs';

// In extension.ts activation:
let httpServer: DebriefHTTPServer | null = null;

const debriefConfig = createDebriefHttpConfig(
  () => httpServer,          // Getter for server instance
  (s) => { httpServer = s; } // Setter for server instance
);

const toolVaultConfig = createToolVaultConfig();

// Validate before use (optional, for safety)
validateConfigurations([debriefConfig, toolVaultConfig]);
```

---

## Phase 4 Implementation Tasks

### Task 1: ServerStatusBarIndicator Component (4-5 hours)

**File to Create**: `apps/vs-code/src/components/ServerStatusBarIndicator.ts`

**Requirements**:
1. Create VS Code StatusBarItem with `vscode.window.createStatusBarItem()`
2. Manage server state (NotStarted → Starting → Healthy ↔ Error)
3. Update visual indicators based on `SERVER_STATE_VISUALS`
4. Implement QuickPick menu with state-based options
5. Integrate `HealthCheckPoller` and `ServerLifecycleManager`
6. Handle polling lifecycle (startup polling → normal polling)
7. Dispose resources properly

**Component Structure**:
```typescript
class ServerStatusBarIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: ServerState = ServerState.NotStarted;
  private poller: HealthCheckPoller | null = null;
  private lifecycleManager: ServerLifecycleManager;

  constructor(private config: ServerIndicatorConfig) {
    this.lifecycleManager = new ServerLifecycleManager();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100  // Priority
    );
    this.updateVisuals();
    this.statusBarItem.command = `${config.name.toLowerCase().replace(' ', '-')}.showMenu`;
    this.statusBarItem.show();
  }

  private updateVisuals(): void {
    const visuals = SERVER_STATE_VISUALS[this.currentState];
    this.statusBarItem.text = `${visuals.icon} ${this.config.name}`;
    this.statusBarItem.tooltip = `${this.config.name}: ${visuals.tooltipSuffix}`;

    if (visuals.color) {
      this.statusBarItem.color = visuals.color;
    }
    if (visuals.backgroundColor) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(visuals.backgroundColor);
    }
  }

  async start(): Promise<void> {
    try {
      this.setState(ServerState.Starting);

      // Start server
      await this.lifecycleManager.start(this.config);

      // Wait for healthy with startup polling
      await this.lifecycleManager.waitForHealthy(this.config, 30000, 500);

      // Success - switch to normal polling
      this.setState(ServerState.Healthy);
      this.startNormalPolling();

    } catch (error) {
      this.handleError(error);
    }
  }

  async stop(): Promise<void> {
    await this.lifecycleManager.stop(this.config);
    this.stopPolling();
    this.setState(ServerState.NotStarted);
  }

  async restart(): Promise<void> {
    this.stopPolling();
    await this.lifecycleManager.restart(this.config);
    await this.lifecycleManager.waitForHealthy(this.config);
    this.setState(ServerState.Healthy);
    this.startNormalPolling();
  }

  private startNormalPolling(): void {
    this.poller = new HealthCheckPoller(
      this.config.healthCheckUrl,
      this.config.pollInterval || 5000,
      (isHealthy) => {
        this.setState(isHealthy ? ServerState.Healthy : ServerState.Error);
      }
    );
    this.poller.start();
  }

  private stopPolling(): void {
    if (this.poller) {
      this.poller.dispose();
      this.poller = null;
    }
  }

  private setState(newState: ServerState): void {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.updateVisuals();
    }
  }

  dispose(): void {
    this.stopPolling();
    this.statusBarItem.dispose();
  }
}
```

### Task 2: QuickPick Menu Implementation (1-2 hours)

**Requirements**:
- Show state-appropriate actions
- Handle user selection
- Call appropriate methods

**Menu Structure by State**:

| State | Menu Options |
|-------|-------------|
| NotStarted | "▶ Start Server", "📊 Show Details" (if callback exists) |
| Starting | "⏹ Stop Server" (cancel startup) |
| Healthy | "⏹ Stop Server", "🔄 Restart Server", "🌐 Open Web UI" (if callback exists), "📊 Show Details" |
| Error | "🔄 Restart Server", "⏹ Stop Server", "📊 Show Details", "📋 Show Logs" |

**Implementation**:
```typescript
async showMenu(): Promise<void> {
  const items: vscode.QuickPickItem[] = [];

  switch (this.currentState) {
    case ServerState.NotStarted:
      items.push({ label: '▶ Start Server', description: `Start ${this.config.name}` });
      break;

    case ServerState.Starting:
      items.push({ label: '⏹ Stop Server', description: 'Cancel startup' });
      break;

    case ServerState.Healthy:
      items.push({ label: '⏹ Stop Server', description: 'Stop the server' });
      items.push({ label: '🔄 Restart Server', description: 'Restart the server' });
      if (this.config.onOpenWebUI) {
        items.push({ label: '🌐 Open Web UI', description: 'Open in browser' });
      }
      break;

    case ServerState.Error:
      items.push({ label: '🔄 Restart Server', description: 'Try to recover' });
      items.push({ label: '⏹ Stop Server', description: 'Stop the server' });
      break;
  }

  if (this.config.onShowDetails) {
    items.push({ label: '📊 Show Details', description: 'Show server status' });
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `${this.config.name} - ${this.currentState}`
  });

  if (selected) {
    await this.handleMenuSelection(selected.label);
  }
}
```

### Task 3: Extension Integration (1 hour)

**File to Modify**: `apps/vs-code/src/extension.ts`

**Requirements**:
1. Remove existing informational notifications
2. Create server configurations
3. Create ServerStatusBarIndicator instances
4. Register with context.subscriptions
5. **CRITICAL**: Do NOT auto-start servers - let user start via status bar

**Lines to Remove/Modify** (from Phase 1 decisions):
- Line 51: `vscode.window.showInformationMessage('Debrief Extension has been activated successfully!')` - **REMOVE**
- Line 189: `vscode.window.showInformationMessage('Debrief HTTP bridge started...')` - **REMOVE**
- Lines 101-103: Tool Vault startup success notification - **REMOVE**
- Lines 55-58: Do NOT auto-start HTTP server (move to indicator)
- Lines 71-135: Do NOT auto-start Tool Vault server (move to indicator)

**New Code to Add**:
```typescript
import { ServerStatusBarIndicator } from './components/ServerStatusBarIndicator';
import { createDebriefHttpConfig, createToolVaultConfig } from './config/serverIndicatorConfigs';

// In activate():
let httpServer: DebriefHTTPServer | null = null;

// Create configurations
const debriefConfig = createDebriefHttpConfig(
  () => httpServer,
  (s) => { httpServer = s; }
);
const toolVaultConfig = createToolVaultConfig();

// Create indicators
const debriefIndicator = new ServerStatusBarIndicator(debriefConfig);
const toolVaultIndicator = new ServerStatusBarIndicator(toolVaultConfig);

context.subscriptions.push(debriefIndicator, toolVaultIndicator);

// Remove all auto-start logic - servers start via status bar click
```

---

## Visual Design Specifications

### Status Bar Appearance

**NotStarted**:
```
$(server) Debrief HTTP
```
- Color: #858585 (gray)
- Tooltip: "Debrief HTTP: Not Started - Click to start"
- Click: Show QuickPick with "▶ Start Server"

**Starting**:
```
$(sync~spin) Debrief HTTP
```
- Color: #FFA500 (yellow/orange)
- Icon: Spinning animation
- Tooltip: "Debrief HTTP: Starting..."
- Click: Show QuickPick with "⏹ Stop Server"

**Healthy**:
```
$(check) Debrief HTTP
```
- Color: #00FF00 (green)
- Tooltip: "Debrief HTTP: Healthy"
- Click: Show QuickPick with Stop/Restart/WebUI options

**Error**:
```
$(error) Debrief HTTP
```
- Background: `statusBarItem.errorBackground` (red)
- Tooltip: "Debrief HTTP: Error - Click for details"
- Click: Show QuickPick with Restart/Stop/Details options

---

## Error Handling Patterns

### Port Conflict
```typescript
try {
  await this.lifecycleManager.start(this.config);
} catch (error) {
  if (isPortConflictError(error)) {
    const action = await vscode.window.showErrorMessage(
      `Port ${error.port} is in use for ${this.config.name}`,
      'Change Port',
      'Show Details'
    );

    if (action === 'Change Port') {
      // Open settings for Tool Vault
      vscode.commands.executeCommand('workbench.action.openSettings', 'debrief.toolVault.port');
    }
  }
  this.setState(ServerState.Error);
}
```

### Health Check Timeout
```typescript
if (error instanceof HealthCheckTimeoutError) {
  vscode.window.showErrorMessage(
    `${this.config.name} did not respond within ${error.timeoutMs / 1000}s. Check logs for details.`,
    'Show Logs'
  ).then(selection => {
    if (selection === 'Show Logs' && this.config.onShowDetails) {
      this.config.onShowDetails();
    }
  });
}
```

---

## Testing Requirements

### Component Tests (create in `apps/vs-code/src/test/components/`)

**1. `ServerStatusBarIndicator.test.ts`**:
- Test indicator creation and initialization
- Test state transitions (NotStarted → Starting → Healthy)
- Test visual updates (icon, color, tooltip)
- Test polling lifecycle (startup → normal)
- Test error handling for all error types
- Test QuickPick menu options per state
- Test resource disposal

**Mock Requirements**:
- Mock `vscode.window.createStatusBarItem()`
- Mock `HealthCheckPoller`
- Mock `ServerLifecycleManager`
- Mock `vscode.window.showQuickPick()`
- Mock server configurations

---

## Success Criteria for Phase 4

✅ `ServerStatusBarIndicator` component implemented:
- State management (4 states)
- Visual updates based on state
- Polling integration (startup + normal)
- Error handling with proper UI feedback

✅ QuickPick menu implemented:
- State-based options
- All callback integrations (start/stop/restart/WebUI/details)
- User-friendly labels and descriptions

✅ Extension integration complete:
- Removed informational notifications
- Both indicators registered
- No auto-start (user-controlled via status bar)

✅ All tests passing:
- Component state transitions
- Polling lifecycle
- Error scenarios
- Menu interactions

✅ Code quality:
- ESLint zero errors
- TypeScript strict mode
- Proper resource disposal

---

## Known Issues & Workarounds

### Issue 1: Tool Vault `isRunning()` Unreliable
**Problem**: `ToolVaultServerService.isRunning()` returns `config !== null`, not process state
**Workaround**: Always trust health check polling over `isRunning()`
**Phase 4 Action**: Don't call `isRunning()` - rely on health checks and state

### Issue 2: Subprocess Process May Exit After Startup
**Problem**: Tool Vault Python process may exit after successful startup (daemon pattern)
**Workaround**: Don't track process, only health check
**Phase 4 Action**: HealthCheckPoller handles this automatically

---

## Resources

- **Architecture Decisions**: `.claude/task-context/issue-215/decisions.md`
- **Phase 1 Handoff**: `.claude/task-context/issue-215/handoffs/phase1-to-phase2.md`
- **Phase 2 Handoff**: `.claude/task-context/issue-215/handoffs/phase2-to-phase3.md`
- **Type Definitions**: `apps/vs-code/src/types/`
- **Backend Services**: `apps/vs-code/src/services/`
- **Configurations**: `apps/vs-code/src/config/serverIndicatorConfigs.ts`
- **VS Code StatusBarItem Docs**: https://code.visualstudio.com/api/references/vscode-api#StatusBarItem

---

## Timeline

**Estimated Duration**: 4-5 hours

**Task Breakdown**:
1. ServerStatusBarIndicator component (3-4h)
2. QuickPick menu implementation (1h)
3. Extension integration (1h)
4. Component testing (1h)

**Next Step**: Once Phase 4 is complete, create handoff document for Phase 5 (test-developer) with full testing strategy.

---

**Handoff Version**: 1.0
**Phase 3 Agent**: backend-developer
**Phase 4 Agent**: frontend-developer
**Status**: Ready for Phase 4 implementation
