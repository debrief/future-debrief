# Phase 1 → Phase 2 Handoff Document

**From**: systems-analyst (Phase 1)
**To**: typescript-developer (Phase 2)
**Date**: 2025-10-04
**Issue**: #215 - Status Bar Indicators

---

## Phase 1 Completion Summary

✅ **All Phase 1 Tasks Completed**

1. Server architecture analyzed (Debrief HTTP & Tool Vault)
2. VS Code StatusBarItem API capabilities documented
3. State machine designed with 4 states and transition rules
4. Component integration points identified
5. Race conditions and edge cases documented
6. Polling mechanism risk assessment completed
7. Error recovery strategies defined
8. Architecture decision document created

---

## Key Deliverables for Phase 2

You need to create TypeScript type definitions and interfaces based on the architecture decisions. All specifications are in `.claude/task-context/issue-215/decisions.md`.

### 1. ServerIndicatorConfig Interface

**Location**: `apps/vs-code/src/types/ServerIndicatorConfig.ts` (NEW FILE)

**Requirements**:
```typescript
interface ServerIndicatorConfig {
  // Display name for the server (e.g., "Debrief HTTP", "Tool Vault")
  name: string;

  // Health check endpoint URL (e.g., "http://localhost:60123/health")
  healthCheckUrl: string;

  // Polling interval in milliseconds (default: 5000)
  pollInterval?: number;

  // Lifecycle callbacks (all async)
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRestart?: () => Promise<void>;  // Optional, defaults to stop then start

  // UI action callbacks (optional)
  onOpenWebUI?: () => void;          // For Tool Vault only
  onShowDetails?: () => void;        // Show detailed status modal
}
```

**JSDoc Requirements**:
- Document each property with usage examples
- Specify which callbacks are required vs. optional
- Explain when `onOpenWebUI` should be provided (Tool Vault only)
- Clarify that all lifecycle callbacks must be async

### 2. ServerState Enum

**Location**: `apps/vs-code/src/types/ServerState.ts` (NEW FILE)

**Requirements**:
```typescript
enum ServerState {
  NotStarted = 'not_started',  // Gray $(server) icon
  Starting = 'starting',       // Yellow $(sync~spin) icon
  Healthy = 'healthy',         // Green $(check) icon
  Error = 'error'              // Red background $(error) icon
}
```

**Additional Types**:
```typescript
// Visual configuration for each state
interface StateVisuals {
  icon: string;           // VS Code codicon name
  color?: string;         // Optional foreground color
  backgroundColor?: string; // Optional background (only error/warning)
  tooltipSuffix?: string; // Appended to server name in tooltip
}

// Mapping from ServerState to visual configuration
type StateVisualsMap = {
  [key in ServerState]: StateVisuals;
};

// Export the mapping constant
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
```

**JSDoc Requirements**:
- Document the state machine transitions (reference decision doc section 3.2)
- Explain visual mappings for each state
- Provide usage examples for state checks

### 3. Type Guards

**Location**: `apps/vs-code/src/types/ServerIndicatorConfig.ts` (same file)

**Requirements**:
```typescript
// Validate ServerIndicatorConfig at runtime
export function isValidServerIndicatorConfig(
  obj: unknown
): obj is ServerIndicatorConfig {
  // Implement full validation:
  // - Check all required properties exist
  // - Validate types (string, number, function)
  // - Ensure callbacks are functions
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'healthCheckUrl' in obj &&
    'onStart' in obj &&
    'onStop' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string' &&
    typeof (obj as Record<string, unknown>).healthCheckUrl === 'string' &&
    typeof (obj as Record<string, unknown>).onStart === 'function' &&
    typeof (obj as Record<string, unknown>).onStop === 'function'
    // Add validation for optional properties
  );
}
```

### 4. Error Types

**Location**: `apps/vs-code/src/types/ServerIndicatorErrors.ts` (NEW FILE)

**Requirements**:
```typescript
// Base error class for server indicator errors
export class ServerIndicatorError extends Error {
  constructor(
    message: string,
    public readonly serverName: string,
    public readonly state: ServerState
  ) {
    super(message);
    this.name = 'ServerIndicatorError';
  }
}

// Specific error types
export class HealthCheckTimeoutError extends ServerIndicatorError {
  constructor(serverName: string) {
    super(`Health check timeout for ${serverName}`, serverName, ServerState.Error);
    this.name = 'HealthCheckTimeoutError';
  }
}

export class ServerStartupError extends ServerIndicatorError {
  constructor(serverName: string, cause: string) {
    super(`Failed to start ${serverName}: ${cause}`, serverName, ServerState.Error);
    this.name = 'ServerStartupError';
  }
}

export class PortConflictError extends ServerIndicatorError {
  constructor(serverName: string, port: number) {
    super(`Port ${port} already in use for ${serverName}`, serverName, ServerState.Error);
    this.name = 'PortConflictError';
  }
}
```

---

## Integration Points (For Your Reference)

### Existing Types You'll Interface With

1. **VS Code API Types**:
   - `vscode.StatusBarItem` - Return type from `vscode.window.createStatusBarItem()`
   - `vscode.StatusBarAlignment` - `.Left` or `.Right`
   - `vscode.ThemeColor` - For background colors

2. **Server Service Types**:
   - `DebriefHTTPServer` (from `services/debriefHttpServer.ts`)
     - Methods: `start(): Promise<void>`, `stop(): Promise<void>`, `isRunning(): boolean`
   - `ToolVaultServerService` (from `services/toolVaultServer.ts`)
     - Methods: `startServer(): Promise<void>`, `stopServer(): Promise<void>`, `restartServer(): Promise<void>`

### Callback Implementations (Future Phase 3)

Phase 3 will create these callback implementations:

```typescript
// Debrief HTTP callbacks
{
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
  }
}

// Tool Vault callbacks
{
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
}
```

---

## Code Quality Requirements

### TypeScript Strict Mode

**CRITICAL**: All code must pass ESLint with zero errors.

```typescript
// ❌ FORBIDDEN
const result = data as any;

// ✅ REQUIRED
const result = data as { success: boolean; error?: string };
```

### No Unused Variables

```typescript
// ❌ FORBIDDEN
function processData(data, unusedParam) { ... }

// ✅ REQUIRED
function processData(data: unknown, _unusedParam: string) { ... }
```

### Prefer const

```typescript
// ❌ FORBIDDEN
let result = getData(); // Never reassigned

// ✅ REQUIRED
const result = getData();
```

### Console Logging

```typescript
// ❌ FORBIDDEN
console.log('Debug message');

// ✅ ALLOWED
console.error('Error occurred');
console.warn('[ServerIndicator] State changed to Healthy');
```

---

## Testing Requirements

Create unit tests in `apps/vs-code/src/test/types/`:

1. **ServerIndicatorConfig.test.ts**:
   - Test `isValidServerIndicatorConfig()` with valid configs
   - Test rejection of invalid configs (missing properties, wrong types)
   - Test optional property handling

2. **ServerState.test.ts**:
   - Test enum values
   - Test `SERVER_STATE_VISUALS` mapping completeness
   - Verify codicon names are valid strings

3. **ServerIndicatorErrors.test.ts**:
   - Test error message formatting
   - Verify error inheritance chain
   - Test error serialization for logging

---

## Success Criteria for Phase 2

✅ All type files created in `apps/vs-code/src/types/`
✅ TypeScript compilation passes with no errors
✅ ESLint passes with zero errors
✅ All types have comprehensive JSDoc documentation
✅ Type guards validate correctly (100% test coverage)
✅ Error types provide helpful messages
✅ `pnpm typecheck` passes successfully

---

## Blocked Items (Phase 3 Dependencies)

Phase 3 (backend-developer) is blocked until you complete:

1. `ServerIndicatorConfig` interface definition
2. `ServerState` enum definition
3. Type guards for runtime validation
4. Error type hierarchy

Phase 3 will use your types to implement:
- Health check polling mechanism
- Server lifecycle integration
- Error handling and recovery logic

---

## Open Questions for Phase 2

If any of these are unclear, please document your questions before proceeding:

1. **Type Safety**: Should we enforce stricter types for `healthCheckUrl` (e.g., branded type)?
2. **Callback Errors**: Should lifecycle callbacks throw errors or return `Promise<{success: boolean; error?: string}>`?
3. **Optional Callbacks**: Should we provide default implementations for `onRestart`?

**Recommendation**: Use simple types initially. We can refactor for stricter safety in Phase 5 if needed.

---

## Resources

- **Architecture Decision Doc**: `.claude/task-context/issue-215/decisions.md`
- **VS Code API Docs**: https://code.visualstudio.com/api/references/vscode-api#StatusBarItem
- **Existing Server Code**:
  - `apps/vs-code/src/services/debriefHttpServer.ts` (lines 53-270)
  - `apps/vs-code/src/services/toolVaultServer.ts` (lines 29-296)
- **ESLint Config**: `apps/vs-code/eslint.config.js`

---

## Timeline

**Estimated Duration**: 1-2 hours

**Deliverables**:
1. Type definition files (30 min)
2. JSDoc documentation (30 min)
3. Unit tests (30 min)
4. ESLint/typecheck validation (15 min)

**Next Step**: Once Phase 2 is complete, create handoff document for Phase 3 (backend-developer).

---

**Handoff Version**: 1.0
**Phase 1 Agent**: systems-analyst
**Phase 2 Agent**: typescript-developer
**Status**: Ready for Phase 2 implementation
