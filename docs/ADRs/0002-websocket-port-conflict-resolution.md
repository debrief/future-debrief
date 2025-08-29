# ADR-0002: WebSocket Port Conflict Resolution

**Date:** 2025-08-29  
**Status:** Accepted  
**Context:** Multi-instance Docker deployments were experiencing WebSocket port conflicts

## Context

The Debrief VS Code extension runs a WebSocket server on a hardcoded port (60123) to enable Python-to-VS Code communication. When multiple Docker instances are deployed simultaneously, port conflicts arise causing:

1. **Connection refused errors** when the second instance cannot bind to port 60123
2. **Cross-instance communication** where Python scripts from one container accidentally connect to and modify data in another container's VS Code instance
3. **Inconsistent behavior** where users see "success moving two points" but only one point appears selected in their plot editor

## Decision

**Maintain the hardcoded port (60123) and improve error handling** rather than implementing dynamic port allocation.

When the extension detects port 60123 is already in use (EADDRINUSE), it will:
- Display a clear error message instructing the user to close other Debrief instances
- Prevent the extension from starting to avoid undefined behavior
- Log the conflict for debugging purposes

## Alternatives Considered

### 1. Dynamic Port Allocation with File Communication
**Approach:** Extension uses port 0 (OS-assigned), writes actual port to `.vscode/ws-port` file, Python reads file.
- **Pros:** Eliminates port conflicts, automatic port selection
- **Cons:** File-based communication fragile, race conditions, cleanup issues

### 2. Dynamic Port Allocation with VS Code Command Discovery
**Approach:** Extension registers `debrief.getWebSocketPort` command, Python calls `code --command` to discover port.
- **Pros:** No file dependencies, cross-platform
- **Cons:** Slow (500ms-1.7s per discovery), requires VS Code CLI access

### 3. Environment Variable Configuration
**Approach:** Use `DEBRIEF_WS_PORT` environment variable to configure port.
- **Pros:** Explicit configuration, Docker-friendly
- **Cons:** Still requires manual coordination between instances, doesn't solve the fundamental problem

### 4. Process ID-Based Port Calculation
**Approach:** Calculate port as `60000 + (process.pid % 1000)`.
- **Pros:** Automatic uniqueness per VS Code instance
- **Cons:** Still needs discovery mechanism, potential (rare) PID collisions

### 5. Unix Sockets / Named Pipes
**Approach:** Use file-system based sockets instead of network ports.
- **Pros:** No port conflicts, process isolation
- **Cons:** Platform-specific implementation, Windows requires named pipes, more complex

### 6. Docker Port Mapping
**Approach:** Use Docker's port mapping to isolate instances (`-p 60124:60123`, `-p 60125:60123`).
- **Pros:** Clean separation at infrastructure level, no code changes
- **Cons:** Requires manual coordination, doesn't solve the underlying multi-instance issue

## Rationale

The hardcoded port approach with improved error handling was chosen because:

1. **Simplicity:** Zero code complexity compared to dynamic solutions
2. **Clarity:** Explicit error messages guide users to correct resolution
3. **Intended Use Case:** The extension is designed for single-instance use per workspace
4. **Existing Infrastructure:** Port conflict detection already implemented, just needs better messaging
5. **Fail-Fast Principle:** Better to fail immediately with clear guidance than allow undefined behavior

## Implementation

Update the error message in `debriefWebSocketServer.ts`:

```typescript
if (error.code === 'EADDRINUSE') {
    console.error(`Port ${this.port} is already in use`);
    vscode.window.showErrorMessage(
        `WebSocket server port ${this.port} is already in use. ` +
        `Please close other Debrief extension instances or Docker containers using this port.`
    );
}
```

## Consequences

### Positive
- **Clear user experience:** Users get explicit guidance when conflicts occur
- **Maintains simplicity:** No additional complexity in port discovery or caching
- **Prevents data corruption:** Eliminates risk of cross-instance communication
- **Quick resolution:** Users can immediately identify and resolve conflicts

### Negative  
- **Single instance limitation:** Only one Debrief extension can run per environment
- **Manual coordination required:** Users must manually manage multiple deployments
- **Potential workflow disruption:** Users must close existing instances to start new ones

### Neutral
- **Status quo maintained:** Existing Python scripts continue to work without modification
- **Docker deployment unchanged:** No additional configuration required in containers