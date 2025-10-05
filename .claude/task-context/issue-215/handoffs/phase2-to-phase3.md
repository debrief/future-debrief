# Phase 2 → Phase 3 Handoff Document

**From**: typescript-developer (Phase 2)
**To**: backend-developer (Phase 3)
**Date**: 2025-10-04
**Issue**: #215 - Status Bar Indicators

---

## Phase 2 Completion Summary

✅ **All Phase 2 Tasks Completed Successfully**

1. Created `ServerState` enum with visual mappings ✅
2. Created `ServerIndicatorConfig` interface with comprehensive JSDoc ✅
3. Implemented type guards for runtime validation ✅
4. Created error type hierarchy (5 error classes) ✅
5. Wrote 100+ unit tests with full edge case coverage ✅
6. Verified ESLint compliance (zero errors in new code) ✅

---

## Deliverables Summary

### Type Definition Files Created

**1. `apps/vs-code/src/types/ServerState.ts`** (150 lines)
- `ServerState` enum (4 states: NotStarted, Starting, Healthy, Error)
- `StateVisuals` interface for visual configuration
- `SERVER_STATE_VISUALS` constant with complete mappings
- `isServerState()` type guard for runtime validation

**2. `apps/vs-code/src/types/ServerIndicatorConfig.ts`** (200 lines)
- `ServerIndicatorConfig` interface with all required/optional properties
- `isValidServerIndicatorConfig()` type guard with comprehensive validation
- `hasValidPollInterval()` helper for interval bounds checking (1000-30000ms)
- Complete JSDoc with usage examples for both servers

**3. `apps/vs-code/src/types/ServerIndicatorErrors.ts`** (220 lines)
- `ServerIndicatorError` base class with serverName and state properties
- 5 specialized error classes:
  - `HealthCheckTimeoutError` - Server failed to respond within timeout
  - `ServerStartupError` - Server startup failed with cause
  - `PortConflictError` - Port already in use (specific port number)
  - `HealthCheckFailureError` - Health check returned non-200 or error
  - `ServerCallbackError` - User callback threw error
- Type guards: `isServerIndicatorError()`, `isPortConflictError()`

### Test Files Created

**1. `apps/vs-code/src/test/types/ServerState.test.ts`** (40+ tests)
- Enum value validation
- Visual mappings completeness
- Codicon format validation
- Type guard edge cases

**2. `apps/vs-code/src/test/types/ServerIndicatorConfig.test.ts`** (45+ tests)
- Interface validation (required/optional properties)
- Type guard with invalid inputs
- Poll interval bounds checking
- URL format validation

**3. `apps/vs-code/src/test/types/ServerIndicatorErrors.test.ts`** (30+ tests)
- Error hierarchy validation
- Type guard accuracy
- Error message formatting
- Inheritance chain verification

---

## Key Architectural Insights for Phase 3

### 1. Server State Management

**State Transition Flow** (from Phase 1 decisions):
```
NotStarted → Starting → Healthy ↔ Error
               ↓           ↓
           Error ← ────────┘
```

**Debouncing Requirements**:
- State changes: 300ms debounce (except NotStarted → Starting, which is immediate)
- Health check failures: Require 3 consecutive failures before Error state
- Startup timeout: 30 seconds before transitioning to Error

### 2. Polling Strategy

**Health Check Intervals**:
- **Default**: 5000ms (5 seconds) during normal operation
- **Startup**: 500ms during Starting state (faster feedback)
- **Bounds**: 1000-30000ms (enforced by `hasValidPollInterval()`)
- **Performance**: <0.1% CPU, ~24 requests/min at 5s interval

**Abort Handling**:
- Use `AbortController` for all fetch requests
- Cancel in-flight requests on state transitions
- Dispose all timers in cleanup

### 3. Server Integration Points

#### Debrief HTTP Server
```typescript
// Direct instance access (synchronous)
const server = new DebriefHTTPServer();
await server.start();    // May throw if port in use
await server.stop();     // Graceful shutdown
server.isRunning()       // Returns: boolean
```

**Health Check**: `GET http://localhost:60123/health`
**Expected Response**: `{ status: "healthy", transport: "http", port: 60123 }`

#### Tool Vault Server
```typescript
// Singleton access (async startup)
const service = ToolVaultServerService.getInstance();
await service.startServer();     // Connects to existing or spawns new
await service.stopServer();      // SIGTERM → SIGKILL
await service.restartServer();   // Optimized restart
const isRunning = service.isRunning(); // Returns: boolean (config-based, NOT process!)
```

**CRITICAL**: `isRunning()` returns `this.config !== null`, NOT process state!
- Health check polling must override this
- Server may be "running" (isRunning=true) but health check fails
- Always trust health check over `isRunning()`

**Health Check**: `GET http://localhost:60124/health`
**Expected Response**: `{ /* varies */ }` (any 200 OK response is healthy)

---

## Phase 3 Implementation Tasks

### Task 1: Health Check Polling Service (2-3 hours)

**File to Create**: `apps/vs-code/src/services/HealthCheckPoller.ts`

**Requirements**:
1. Accept `healthCheckUrl` and `pollInterval` from config
2. Use `AbortController` for cancellable fetch requests
3. Implement exponential backoff on repeated failures (3 attempts before Error)
4. Handle network errors gracefully (ECONNREFUSED, timeout, etc.)
5. Return health check results via callback or Promise
6. Dispose method to cancel polling and cleanup timers

**Pseudocode**:
```typescript
class HealthCheckPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private consecutiveFailures = 0;

  constructor(
    private url: string,
    private interval: number,
    private onHealthChange: (isHealthy: boolean) => void
  ) {}

  start(): void {
    this.intervalId = setInterval(async () => {
      this.abortController = new AbortController();
      try {
        const response = await fetch(this.url, {
          signal: this.abortController.signal,
          timeout: 5000
        });

        if (response.ok) {
          this.consecutiveFailures = 0;
          this.onHealthChange(true);
        } else {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= 3) {
            this.onHealthChange(false);
          }
        }
      } catch (error) {
        // Handle timeout, ECONNREFUSED, etc.
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          this.onHealthChange(false);
        }
      }
    }, this.interval);
  }

  dispose(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
```

### Task 2: Server Lifecycle Integration (1-2 hours)

**File to Create**: `apps/vs-code/src/services/ServerLifecycleManager.ts`

**Requirements**:
1. Wrap `onStart()`, `onStop()`, `onRestart()` callbacks with error handling
2. Throw appropriate error types from `ServerIndicatorErrors.ts`
3. Detect port conflicts (EADDRINUSE) and throw `PortConflictError`
4. Implement startup timeout (30s) and throw `HealthCheckTimeoutError`
5. Handle subprocess crashes for Tool Vault server
6. Log all lifecycle events for debugging

**Pseudocode**:
```typescript
class ServerLifecycleManager {
  async start(config: ServerIndicatorConfig): Promise<void> {
    try {
      await config.onStart();
    } catch (error) {
      // Detect error type and throw appropriate ServerIndicatorError
      if (error.code === 'EADDRINUSE') {
        const port = extractPortFromError(error);
        throw new PortConflictError(config.name, port);
      }
      throw new ServerStartupError(
        config.name,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async stop(config: ServerIndicatorConfig): Promise<void> {
    try {
      await config.onStop();
    } catch (error) {
      // Log but don't throw - stop should be idempotent
      console.error(`Failed to stop ${config.name}:`, error);
    }
  }

  async restart(config: ServerIndicatorConfig): Promise<void> {
    if (config.onRestart) {
      await config.onRestart();
    } else {
      await this.stop(config);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for port release
      await this.start(config);
    }
  }
}
```

### Task 3: Configuration Integration (1 hour)

**Files to Modify**:
- `apps/vs-code/src/extension.ts` (create configs for both servers)

**Debrief HTTP Configuration**:
```typescript
import { ServerIndicatorConfig } from './types/ServerIndicatorConfig';

const debriefHttpConfig: ServerIndicatorConfig = {
  name: 'Debrief HTTP',
  healthCheckUrl: 'http://localhost:60123/health',
  pollInterval: 5000,
  onStart: async () => {
    if (!webSocketServer) {
      webSocketServer = new DebriefHTTPServer();
    }
    await webSocketServer.start();
  },
  onStop: async () => {
    if (webSocketServer) {
      await webSocketServer.stop();
      webSocketServer = null;
    }
  },
  // No onOpenWebUI - Debrief HTTP has no web interface
  // No onShowDetails - could add output channel later
};
```

**Tool Vault Configuration**:
```typescript
const toolVaultConfig: ServerIndicatorConfig = {
  name: 'Tool Vault',
  healthCheckUrl: 'http://localhost:60124/health',
  pollInterval: 5000,
  onStart: async () => {
    await ToolVaultServerService.getInstance().startServer();
  },
  onStop: async () => {
    await ToolVaultServerService.getInstance().stopServer();
  },
  onRestart: async () => {
    await ToolVaultServerService.getInstance().restartServer();
  },
  onOpenWebUI: () => {
    vscode.env.openExternal(vscode.Uri.parse('http://localhost:60124'));
  },
  onShowDetails: () => {
    vscode.commands.executeCommand('debrief.toolVaultStatus');
  }
};
```

---

## Testing Requirements

### Integration Tests (create in `apps/vs-code/src/test/services/`)

**1. `HealthCheckPoller.test.ts`**:
- Test successful health checks
- Test consecutive failure detection (3 failures → unhealthy)
- Test abort controller cancellation
- Test timer cleanup on dispose
- Mock fetch with various responses (200, 500, timeout)

**2. `ServerLifecycleManager.test.ts`**:
- Test successful start/stop/restart
- Test port conflict error detection
- Test startup timeout
- Test callback error wrapping
- Mock both server services

**3. Integration test scenarios**:
- Server crashes mid-operation
- Health check transitions (healthy → unhealthy → healthy)
- Rapid start/stop cycles
- Multiple servers polling simultaneously

---

## Error Handling Patterns

### Port Conflict Detection
```typescript
try {
  await config.onStart();
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    // Extract port from error or config
    const port = config.healthCheckUrl.match(/:(\d+)/)?.[1];
    throw new PortConflictError(config.name, parseInt(port || '0'));
  }
}
```

### Health Check Timeout
```typescript
const startTime = Date.now();
while (Date.now() - startTime < 30000) {
  const isHealthy = await checkHealth();
  if (isHealthy) return;
  await delay(500);
}
throw new HealthCheckTimeoutError(config.name, 30000);
```

### Callback Error Wrapping
```typescript
try {
  await config.onStart();
} catch (error) {
  throw new ServerCallbackError(
    config.name,
    'onStart',
    error instanceof Error ? error : new Error(String(error))
  );
}
```

---

## Code Quality Requirements

### TypeScript Strict Mode Compliance

**NO explicit `any` types** (ESLint will fail):
```typescript
// ❌ FORBIDDEN
const result = data as any;

// ✅ REQUIRED
const result = data as { status: string };
```

**Unused variables must be prefixed**:
```typescript
// ❌ FORBIDDEN
function handler(event, unusedContext) { ... }

// ✅ REQUIRED
function handler(event: Event, _unusedContext: Context) { ... }
```

**Console logging restrictions**:
```typescript
// ❌ FORBIDDEN
console.log('Debug message');

// ✅ ALLOWED
console.error('Error occurred');
console.warn('[HealthCheck] Failed');
```

---

## Dependencies and Imports

### Type Imports
```typescript
import { ServerIndicatorConfig } from '../types/ServerIndicatorConfig';
import { ServerState } from '../types/ServerState';
import {
  ServerIndicatorError,
  HealthCheckTimeoutError,
  PortConflictError,
  ServerStartupError,
  ServerCallbackError
} from '../types/ServerIndicatorErrors';
```

### Service Imports
```typescript
import { DebriefHTTPServer } from '../services/debriefHttpServer';
import { ToolVaultServerService } from '../services/toolVaultServer';
```

---

## Success Criteria for Phase 3

✅ `HealthCheckPoller` class implemented with:
- Configurable polling interval
- Abort controller for cancellation
- Consecutive failure detection (3x)
- Proper resource disposal

✅ `ServerLifecycleManager` class implemented with:
- Start/stop/restart methods
- Error type detection and wrapping
- Port conflict handling
- Startup timeout enforcement

✅ Server configurations created in `extension.ts`:
- Debrief HTTP config (basic lifecycle)
- Tool Vault config (with WebUI and details)

✅ Integration tests passing:
- Health check polling scenarios
- Lifecycle error handling
- Mock server responses

✅ ESLint passing with zero errors
✅ TypeScript compilation successful (with shared-types built)

---

## Blocked Items for Phase 4

Phase 4 (frontend-developer) is blocked until you complete:

1. Health check polling mechanism
2. Server lifecycle management
3. Error handling with proper error types
4. Configuration objects for both servers

Phase 4 will use your implementations to create the UI component that displays status and handles user interactions.

---

## Open Questions for Phase 3

If unclear, document before proceeding:

1. **Polling Frequency**: Should startup polling (500ms) be configurable or hardcoded?
2. **Failure Threshold**: Is 3 consecutive failures the right threshold before Error state?
3. **Timeout Duration**: Is 30 seconds appropriate for all servers or should it be configurable?
4. **Logging Level**: Should health checks be logged at `console.warn` level or only on failure?

**Recommendation**: Use the specifications as-is initially. We can make these configurable in Phase 5 if needed.

---

## Resources

- **Architecture Decisions**: `.claude/task-context/issue-215/decisions.md`
- **Phase 1 Handoff**: `.claude/task-context/issue-215/handoffs/phase1-to-phase2.md`
- **Type Definitions**: `apps/vs-code/src/types/`
- **Existing Server Code**:
  - `apps/vs-code/src/services/debriefHttpServer.ts`
  - `apps/vs-code/src/services/toolVaultServer.ts`
- **Extension Entry**: `apps/vs-code/src/extension.ts`

---

## Timeline

**Estimated Duration**: 3-4 hours

**Task Breakdown**:
1. Health Check Polling Service (2-3h)
2. Server Lifecycle Integration (1-2h)
3. Configuration Creation (1h)
4. Integration Testing (1h)

**Next Step**: Once Phase 3 is complete, create handoff document for Phase 4 (frontend-developer) with UI component specifications.

---

**Handoff Version**: 1.0
**Phase 2 Agent**: typescript-developer
**Phase 3 Agent**: backend-developer
**Status**: Ready for Phase 3 implementation
