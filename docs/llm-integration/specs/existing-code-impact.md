# Existing Code Impact Analysis

**Back to**: [Main Index](../README.md) | **Related**: [Phase 1 Plan](../phases/phase-1-implementation.md)

---

## Overview

This document identifies existing code that must be refactored for MCP integration.

**Key Insight**: Most code does NOT need refactoring - we're adding new endpoints to existing servers!

---

## Code That NEEDS Refactoring

### 1. Debrief WebSocket Server
**File**: `apps/vs-code/src/services/debriefWebSocketServer.ts`

**Changes**:
- [ ] Add Express HTTP server alongside WebSocket
- [ ] Add POST `/mcp` endpoint
- [ ] Route MCP requests to existing `handleCommand()`
- [ ] Keep WebSocket for VS Code extension (backward compatibility)

**Estimated Effort**: 2-3 days

### 2. Python Script Client
**File**: `apps/vs-code/workspace/tests/debrief_api.py`

**Changes**:
- [ ] Replace WebSocket client with HTTP POST to `/mcp`
- [ ] Use JSON-RPC 2.0 request format
- [ ] Simpler implementation (no connection management!)

**Estimated Effort**: 1 day

---

## Code That Does NOT Need Refactoring

✅ **GlobalController.processToolVaultCommands()** - Already using `ToolVaultCommandHandler` correctly

✅ **ToolVaultCommandHandler** (`libs/web-components/src/services/ToolVaultCommandHandler.ts`) - Reusable service works for both WebSocket and MCP

✅ **Tool Vault Server** (`libs/tool-vault-packager/server.py`) - Clean MCP-only implementation, no legacy endpoints

---

## Architecture Clarification

**Existing Integration Flow**:
```
GlobalController.executeTool()
  ↓ calls Tool Vault
Tool Vault returns ToolVaultCommands
  ↓
GlobalController.processToolVaultCommands()
  ↓ delegates to
ToolVaultCommandHandler.processCommands()
  ↓ updates
GlobalController.updateState()
```

**NEW MCP Flow (reuses same code!)**:
```
LLM Extension
  ↓ HTTP POST /mcp
Debrief State Server (NEW /mcp endpoint)
  ↓ routes to existing
GlobalController.executeTool()
  ↓ (same flow as above)
```

**No duplication** - same command handling logic serves both WebSocket and MCP clients!

---

## Detailed Analysis

For complete code analysis including:
- Current Tool-Vault integration code locations
- Debrief WebSocket Server command list
- Required refactoring tasks
- Testing requirements
- Architecture diagrams

See: [Original Architecture Document - Section 5.0.2](../../llm-integration-architecture.md#502-existing-code-impact-analysis)

---

**Back to**: [Main Index](../README.md)
