# Authentication

**Back to**: [Main Index](../README.md) | **Related**: [Security Constraints](security-constraints.md)

---

## Overview

This document covers authentication and authorization patterns for LLM-initiated operations in Future Debrief.

---

## For Local Services (Current Architecture)

### Current State

- **WebSocket server (60123)**: No authentication (localhost-only)
- **Tool Vault server (60124)**: No authentication (localhost-only)

### Security Model

**Services bound to localhost interface only**:
- VS Code extension manages service lifecycle
- Network isolation provides security boundary
- LLM extensions run with user's OS permissions

---

## For LLM-Initiated Operations

### Phase 1: No Additional Authentication (Recommended)

**Rationale**:

1. **Trust Boundary**: LLM extensions run in user's environment with full user privileges
2. **Service Architecture**: Services already localhost-only with no external exposure
3. **Operational Simplicity**: No auth reduces complexity for initial rollout
4. **Lifecycle Management**: VS Code extension controls service lifecycle

**Threat Model**:
- ✅ **Protected**: External network access (localhost-only)
- ✅ **Protected**: Unauthorized process access (OS-level permissions)
- ⚠️ **Assumed**: User trusts LLM extensions they install
- ⚠️ **Assumed**: No malicious processes on user's machine

---

## Future Enhancement (Phase 2+)

### API Key Authentication

**Implementation Example**:

```typescript
// Generate API key on extension startup
const apiKey = crypto.randomBytes(32).toString('hex');

// Store in environment variable for MCP servers
process.env.DEBRIEF_API_KEY = apiKey;

// MCP server validates on each request
function validateApiKey(request: MCPRequest): boolean {
  return request.apiKey === process.env.DEBRIEF_API_KEY;
}
```

**Benefits**:
- Enables multi-tenant scenarios (future)
- Provides audit trail for API usage
- Allows rate limiting per client

**Trade-offs**:
- Increased complexity
- Key management overhead
- Not needed for Phase 1 localhost deployment

---

## Audit Logging

### Log Levels

- **DEBUG**: Detailed protocol messages, state transitions
- **INFO**: Tool calls, successful operations, connection events
- **WARN**: Retries, rate limiting, deprecation warnings
- **ERROR**: Failures, exceptions, connection errors

### Structured Logging Format

```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;        // 'debrief-state' | 'tool-vault'
  operation: string;      // e.g., 'tool_call', 'websocket_connect'
  toolName?: string;      // MCP tool name
  duration?: number;      // milliseconds
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}
```

### Example Log Entries

```json
{
  "timestamp": "2025-10-03T14:23:45.123Z",
  "level": "INFO",
  "service": "debrief-state",
  "operation": "tool_call",
  "toolName": "debrief_get_selection",
  "duration": 45,
  "success": true,
  "metadata": {
    "filename": "mission1.plot.json",
    "selectedCount": 2
  }
}
```

---

**Back to**: [Main Index](../README.md)
