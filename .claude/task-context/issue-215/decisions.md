# Issue #215: Status Bar Indicators - Architecture Decisions

## Phase 1: Systems Analysis Complete

**Date**: 2025-10-04
**Agent**: systems-analyst
**Model**: Sonnet 4.5

---

## 1. Server Architecture Analysis

### 1.1 Debrief HTTP Server

**Location**: `apps/vs-code/src/services/debriefHttpServer.ts`

**Lifecycle Pattern**: Direct JavaScript Process (Singleton)
- Created and started in `extension.ts:54-58`
- Managed via `DebriefHTTPServer` class instance
- Methods: `start()`, `stop()`, `isRunning()`
- Health check: `GET http://localhost:60123/health`
- Port: 60123 (fixed)
- Startup: Immediate on extension activation
- State tracking: `this.app !== null && this.httpServer !== null`

**Key Characteristics**:
- Express.js HTTP server embedded in extension process
- Direct access to VS Code API and document state
- Health check returns `{ status: 'healthy', transport: 'http', port: 60123 }`
- Synchronous lifecycle control (no subprocess management)
- Error recovery: Automatic port conflict resolution with retry logic

### 1.2 Tool Vault Server

**Location**: `apps/vs-code/src/services/toolVaultServer.ts`

**Lifecycle Pattern**: Python Subprocess (Singleton)
- Managed via `ToolVaultServerService.getInstance()`
- Methods: `startServer()`, `stopServer()`, `healthCheck()`, `isRunning()`
- Health check: `GET http://localhost:60124/health` (via fetch)
- Port: 60124 (configurable via settings)
- Startup: Async with retry logic, connects to existing server if available
- State tracking: `this.config !== null` (not process-based!)
- Process: Can exit after startup (daemon pattern), presence of config indicates running state

**Key Characteristics**:
- Python subprocess spawned via `spawn()`
- Stdout/stderr piped to OutputChannel ('Debrief Tools')
- Health check via HTTP fetch (may fail even if config exists)
- Async startup with `waitForServerReady()` polling
- Configuration-driven: Auto-detects or uses VS Code settings
- **Critical**: `isRunning()` returns `this.config !== null`, not process state
- **Callback**: `setOnServerReadyCallback()` triggers when server becomes available

---

## 2. VS Code StatusBarItem API Capabilities

### 2.1 Properties

| Property | Type | Description | Constraints |
|----------|------|-------------|-------------|
| `text` | `string` | Entry text with icon support | Syntax: `$(icon-name)` for codicons |
| `tooltip` | `string \| MarkdownString` | Hover tooltip | Supports markdown formatting |
| `command` | `string \| Command` | Click action | Must be registered command |
| `color` | `string \| ThemeColor` | Foreground color | Any color value |
| `backgroundColor` | `ThemeColor` | Background color | **ONLY** `statusBarItem.errorBackground` or `statusBarItem.warningBackground` |
| `alignment` | `StatusBarAlignment` | Left or Right | `StatusBarAlignment.Left` or `.Right` |
| `priority` | `number` | Sort order | Higher = more left (within alignment) |
| `id` | `string` | Unique identifier | Set via `createStatusBarItem(id, ...)` |

### 2.2 Methods

- `show()`: Display in status bar (non-blocking)
- `hide()`: Remove from status bar (non-blocking)
- `dispose()`: Cleanup and free resources

### 2.3 Limitations & Constraints

1. **Background Color Restriction**: Only error (red) and warning (yellow) backgrounds supported
2. **No Custom Animations**: VS Code provides no built-in animation support
3. **Icon Limitation**: Must use codicons from VS Code's built-in set
4. **Modal Behavior**: Click actions block until command completes
5. **No Nested Menus**: QuickPick menu is flat, modal, and blocks other interactions
6. **Tooltip Format**: Supports markdown but rendering quality varies
7. **Update Performance**: Frequent updates (< 100ms) may cause flicker

---

## 3. State Machine Design

### 3.1 Server States

```
┌─────────────┐
│ NotStarted  │ (Gray, $(server) icon)
└─────┬───────┘
      │ start() called
      ▼
┌─────────────┐
│  Starting   │ (Yellow, $(sync~spin) icon)
└─────┬───────┘
      │ health check passes
      ▼
┌─────────────┐
│   Healthy   │ (Green, $(check) icon)
└─────┬───────┘
      │ health check fails
      ▼
┌─────────────┐
│    Error    │ (Red background, $(error) icon)
└─────┬───────┘
      │ restart() or auto-retry
      └──────► Starting
```

### 3.2 State Transition Rules

| From State | To State | Trigger | Validation |
|------------|----------|---------|------------|
| NotStarted | Starting | User clicks "Start Server" | None (always allowed) |
| Starting | Healthy | Health check returns 200 OK | Poll every 500ms for 30s |
| Starting | Error | Health check timeout (30s) or process crash | Log detailed error |
| Healthy | Error | 3 consecutive failed health checks | Debounce transient failures |
| Error | Starting | User clicks "Restart" or auto-retry (if configured) | Stop existing process first |
| Any | NotStarted | User clicks "Stop Server" | Graceful shutdown (SIGTERM → SIGKILL) |

### 3.3 Visual State Mappings

| State | Icon | Color | Background | Tooltip Example |
|-------|------|-------|------------|-----------------|
| NotStarted | `$(server)` | Gray (`#858585`) | None | "Debrief HTTP: Not Started - Click to start" |
| Starting | `$(sync~spin)` | Yellow (`#FFA500`) | None | "Debrief HTTP: Starting... (attempt 1/6)" |
| Healthy | `$(check)` | Green (`#00FF00`) | None | "Debrief HTTP: Healthy - Port 60123" |
| Error | `$(error)` | White | `statusBarItem.errorBackground` | "Debrief HTTP: Error - Port conflict" |

**Note**: The `~spin` modifier creates a spinning animation for the sync icon during "Starting" state.

---

## 4. Component Integration Points

### 4.1 Existing Services Integration

#### DebriefHTTPServer Integration
```typescript
// In extension.ts (existing code)
webSocketServer = new DebriefHTTPServer(); // Line 54
webSocketServer.start().catch(...);         // Line 55

// NEW: Status indicator integration
const debriefIndicator = new ServerStatusBarIndicator({
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
  onRestart: async () => {
    // Stop then start
    await this.onStop();
    await this.onStart();
  }
});
context.subscriptions.push(debriefIndicator);
```

#### ToolVaultServerService Integration
```typescript
// In extension.ts (existing code)
toolVaultServer = ToolVaultServerService.getInstance(); // Line 68
await toolVaultServer.startServer();                     // Line 78

// NEW: Status indicator integration
const toolVaultIndicator = new ServerStatusBarIndicator({
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
    await service.restartServer(); // Uses existing method
  },
  onOpenWebUI: () => {
    vscode.env.openExternal(vscode.Uri.parse('http://localhost:60124'));
  },
  onShowDetails: () => {
    // Trigger existing 'debrief.toolVaultStatus' command
    vscode.commands.executeCommand('debrief.toolVaultStatus');
  }
});
context.subscriptions.push(toolVaultIndicator);
```

### 4.2 Notifications to Remove

**Current Behavior** (lines to remove/modify):
- `extension.ts:51` - "Debrief Extension has been activated successfully!" (REMOVE)
- `extension.ts:189` - "Debrief HTTP bridge started on port 60123" (REMOVE)
- `extension.ts:101-103` - Tool Vault startup success message (REMOVE)

**Replacement**: Status bar indicators show state without interruption.

**Keep** (error notifications):
- `extension.ts:57` - HTTP server startup failure (ERROR, keep)
- `extension.ts:114-130` - Tool Vault startup failure with actions (WARNING, keep)

---

## 5. Race Conditions & Edge Cases

### 5.1 Identified Race Conditions

1. **Concurrent Start Requests**
   - **Scenario**: User clicks "Start" twice rapidly
   - **Risk**: Multiple server processes or port conflicts
   - **Mitigation**: Debounce start button with 2-second cooldown, show "Starting..." state immediately

2. **Health Check During Shutdown**
   - **Scenario**: Polling interval fires while `stop()` is in progress
   - **Risk**: False "Error" state after successful shutdown
   - **Mitigation**: Cancel active polling timers before stop(), ignore health check failures if state is "NotStarted"

3. **Rapid State Transitions**
   - **Scenario**: Server crashes immediately after successful start
   - **Risk**: Visual flicker (green → red in < 1s)
   - **Mitigation**: Debounce state changes with 300ms delay, except NotStarted → Starting (immediate)

4. **Extension Deactivation During Polling**
   - **Scenario**: VS Code closes while health check is in flight
   - **Risk**: Unhandled promise rejections, memory leaks
   - **Mitigation**: Dispose polling timers in `dispose()`, use AbortController for fetch requests

5. **ToolVault Config Changes During Runtime**
   - **Scenario**: User changes `debrief.toolVault.port` while server is running
   - **Risk**: Health check polls old port, indicator shows "Error" despite server running on new port
   - **Mitigation**: Listen to `vscode.workspace.onDidChangeConfiguration`, restart polling on relevant config changes

### 5.2 Edge Case Handling

1. **Port Already in Use**
   - **Detection**: `start()` throws EADDRINUSE error
   - **UI Response**: Error state with tooltip "Port 60123 in use"
   - **User Action**: "Show Logs" and "Change Port" buttons in QuickPick

2. **Health Check Timeout**
   - **Scenario**: Server starts but never responds to `/health`
   - **Timeout**: 30 seconds (6 attempts × 5s interval)
   - **UI Response**: Transition to Error state with "Server not responding" tooltip

3. **Transient Network Failures**
   - **Scenario**: Single health check fails due to network congestion
   - **Mitigation**: Require 3 consecutive failures before transitioning to Error state
   - **Rationale**: Prevent flicker from temporary issues

4. **Server Process Orphaned**
   - **Scenario**: VS Code crashes, leaving server running
   - **Detection**: On next start, DebriefHTTPServer detects port in use
   - **Recovery**: Attempt graceful connection to existing server via health check, prompt user to "Reconnect" or "Force Restart"

5. **Zero Open Plot Files**
   - **Scenario**: DebriefHTTPServer running but no `.plot.json` files open
   - **UI Impact**: Server indicator shows "Healthy" (server is functional)
   - **Note**: This is not an error condition, server should remain available

---

## 6. Polling Mechanism Risk Assessment

### 6.1 Performance Impact Analysis

| Metric | Value | Risk Level | Justification |
|--------|-------|------------|---------------|
| **Poll Interval** | 5 seconds | Low | Industry standard for health checks |
| **Request Size** | ~200 bytes | Low | GET request with minimal overhead |
| **Response Size** | ~100 bytes | Low | JSON: `{"status":"healthy","port":60123}` |
| **CPU Impact** | < 0.1% | Low | Async fetch with no parsing complexity |
| **Memory Impact** | < 1 KB | Low | No state accumulation between polls |
| **Network Impact** | ~60 KB/hour | Low | Localhost traffic, no external network |

### 6.2 Failure Scenarios

1. **High CPU Usage**
   - **Probability**: Very Low
   - **Impact**: Slow UI responsiveness
   - **Detection**: VS Code performance profiler
   - **Mitigation**: Increase poll interval to 10s if CPU > 80%

2. **Memory Leak**
   - **Probability**: Low
   - **Impact**: Extension crash after hours of use
   - **Detection**: Heap snapshot analysis
   - **Mitigation**: Proper timer disposal in `dispose()`, use WeakMap for callbacks

3. **Polling Storm**
   - **Probability**: Medium (if multiple indicators created)
   - **Impact**: Unnecessary HTTP traffic
   - **Mitigation**: Singleton pattern for ServerStatusBarIndicator instances, shared health check cache

### 6.3 Scalability Considerations

- **Current**: 2 servers × 1 poll per 5s = 24 requests/min
- **Future**: If adding more servers, consider:
  - Shared polling service (single interval for all servers)
  - Exponential backoff on repeated failures
  - WebSocket subscriptions instead of HTTP polling

---

## 7. Error Recovery Strategies

### 7.1 Automatic Recovery (No User Action)

1. **Transient Network Failure**
   - **Detection**: Single health check failure
   - **Action**: Log warning, continue polling
   - **Rationale**: Avoid false alarms

2. **Server Slow Start**
   - **Detection**: Health check fails during "Starting" state
   - **Action**: Continue polling for 30 seconds
   - **Rationale**: Python subprocess may take 10-15s to bind port

3. **Connection Refused (Server Crashed)**
   - **Detection**: `fetch()` throws ECONNREFUSED
   - **Action**: Transition to Error state, show restart option
   - **Rationale**: Server is definitively not running

### 7.2 User-Initiated Recovery

1. **Manual Restart**
   - **Trigger**: User clicks "Restart Server" in QuickPick
   - **Process**:
     1. Set state to "NotStarted"
     2. Stop existing server (if running)
     3. Wait 1 second for port release
     4. Start server
     5. Begin polling for health
   - **Timeout**: 30 seconds before showing Error state

2. **Change Port (Tool Vault Only)**
   - **Trigger**: User clicks "Change Port" in error QuickPick
   - **Process**:
     1. Open VS Code settings filtered to `debrief.toolVault.port`
     2. Wait for configuration change event
     3. Restart server with new port
   - **Note**: Debrief HTTP uses fixed port 60123 (no configuration)

3. **Show Logs**
   - **Trigger**: User clicks "Show Logs" in error QuickPick
   - **Process**:
     - Debrief HTTP: Show VS Code output channel (if available)
     - Tool Vault: Show 'Debrief Tools' OutputChannel via `getOutputChannel().show()`
   - **Rationale**: Help users diagnose issues (missing dependencies, permission errors)

### 7.3 Graceful Degradation

- **No Status Bar Access**: Fall back to command palette commands
- **Health Endpoint Unavailable**: Show "Unknown" state with manual start/stop buttons
- **QuickPick Fails**: Use information messages with action buttons as fallback

---

## 8. Implementation Recommendations

### 8.1 Component Structure

```
apps/vs-code/src/components/
└── ServerStatusBarIndicator.ts  (New file, 300-400 lines)

apps/vs-code/src/extension.ts    (Modified, +30 lines)
  - Remove notification lines (51, 189, 101-103)
  - Add indicator creation (~20 lines)
  - Wire to existing server instances (~10 lines)
```

### 8.2 Testing Strategy

1. **Unit Tests** (`ServerStatusBarIndicator.test.ts`):
   - State transitions (10 test cases)
   - Polling logic (timer verification, 5 test cases)
   - Callback invocation (mock verification, 8 test cases)
   - Error handling (exception scenarios, 6 test cases)

2. **Integration Tests** (manual):
   - Start/stop both servers via status bar
   - Verify health check polling with network inspector
   - Test error recovery (kill server process, check indicator)
   - Verify resource cleanup (check for timer leaks)

3. **Regression Tests**:
   - Ensure existing server startup logic still works
   - Verify error notifications are still shown
   - Confirm no performance degradation

### 8.3 Rollout Plan

1. **Phase 2**: Define TypeScript interfaces (ServerIndicatorConfig, ServerState enum)
2. **Phase 3**: Implement health check polling and server lifecycle integration
3. **Phase 4**: Implement UI component with QuickPick menus
4. **Phase 5**: Comprehensive testing and coverage analysis

---

## 9. Open Questions & Risks

### 9.1 Technical Questions

1. **Q**: Should we show a "Reconnecting..." state?
   - **A**: Not initially. Transition directly from Healthy → Error on failure. Future enhancement.

2. **Q**: Should indicators be hideable via settings?
   - **A**: No. Status bar space is not scarce, and indicators are informational, not intrusive.

3. **Q**: Should we support custom health check intervals per server?
   - **A**: No. Fixed 5-second interval is sufficient. Configurability adds complexity with minimal benefit.

### 9.2 Known Risks

1. **Risk**: Tool Vault `isRunning()` returns true even after process exits
   - **Severity**: Medium
   - **Mitigation**: Health check polling will detect actual server state
   - **Long-term**: Refactor `isRunning()` to check process AND health endpoint

2. **Risk**: Frequent status bar updates may cause flicker
   - **Severity**: Low
   - **Mitigation**: Debounce state changes by 300ms
   - **Monitoring**: Watch for user complaints during beta

3. **Risk**: Extension activation time may increase slightly
   - **Severity**: Low
   - **Impact**: +50-100ms for indicator creation (non-blocking)
   - **Mitigation**: Indicators start polling after activation completes

---

## 10. Success Metrics

### 10.1 Functional Requirements

- ✅ Both servers display correct state 99% of the time
- ✅ Health checks poll every 5 seconds without blocking UI
- ✅ State transitions occur within 1 second of actual change
- ✅ QuickPick menus show context-appropriate actions
- ✅ Zero memory leaks over 24-hour extension runtime

### 10.2 User Experience Goals

- ✅ Users can see server status at a glance (no clicks needed)
- ✅ Server control accessible via 2 clicks (indicator → action)
- ✅ No informational notifications during normal operation
- ✅ Error states provide actionable recovery steps
- ✅ Tooltips provide helpful details without clutter

### 10.3 Code Quality Targets

- ✅ TypeScript strict mode compliance (no `any` types)
- ✅ 80%+ test coverage for ServerStatusBarIndicator
- ✅ ESLint passes with zero errors
- ✅ All timers and resources properly disposed
- ✅ JSDoc documentation for all public methods

---

## Handoff to Phase 2

The next phase will focus on defining TypeScript interfaces and types. The `typescript-developer` agent should:

1. Create `ServerIndicatorConfig` interface with all required callbacks
2. Define `ServerState` enum with 4 states (NotStarted, Starting, Healthy, Error)
3. Create type guards for runtime validation
4. Document all types with comprehensive JSDoc
5. Ensure compatibility with existing `DebriefHTTPServer` and `ToolVaultServerService` types

**Key Files to Create**:
- `apps/vs-code/src/types/ServerIndicatorConfig.ts`
- `apps/vs-code/src/types/ServerState.ts`

**Dependencies**: None (Phase 2 can start immediately)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-04
**Next Review**: After Phase 2 completion
