# ADR 001: Streamable-HTTP MCP Transport

**Status**: ✅ Accepted
**Date**: 2025-10-03
**Context**: [LLM Integration Architecture](../README.md)

## Context

LLM extensions need to communicate with Future Debrief's services (Debrief State Server on port 60123 and Tool Vault server on port 60124). The Model Context Protocol (MCP) supports multiple transport mechanisms:

- **stdio**: Local process communication (1:1 client-server)
- **SSE**: Legacy HTTP-based transport (deprecated 2025-03-26)
- **streamable-http**: Modern HTTP transport (introduced 2025-03-26)

## Decision

We will use **MCP streamable-http transport** for all LLM integrations.

## Rationale

### Technical Advantages

1. **Leverages Existing Infrastructure**
   - Debrief State Server already runs HTTP/WebSocket on port 60123
   - Tool Vault already runs FastAPI on port 60124
   - Just add POST `/mcp` endpoint to each - no new processes!

2. **Production-Ready Architecture**
   - Designed for web applications and remote deployments
   - Supports multiple concurrent clients (unlike stdio's 1:1 limitation)
   - Optional Server-Sent Events (SSE) for streaming responses

3. **Minimal Implementation Effort**
   - No wrapper processes needed
   - No process lifecycle management
   - Additive change - existing APIs remain unchanged

4. **Future-Proof**
   - HTTP-based protocol supports remote access if needed
   - Standard JSON-RPC 2.0 messaging
   - Modern replacement for deprecated SSE transport

### Platform Support

All target VS Code LLM integrations support streamable-http:
- ✅ GitHub Copilot (Phase 1)
- ✅ together.dev (Phase 2)
- ✅ Claude VS Code extension

### Comparison with Alternatives

| Aspect | streamable-http (CHOSEN) | stdio |
|--------|--------------------------|-------|
| Implementation Effort | **Low** (add endpoints) | Medium (new wrappers) |
| Server Infrastructure | ✅ Use existing HTTP | ❌ New process management |
| Multiple Clients | ✅ Concurrent support | ❌ 1:1 only |
| Production Ready | ✅ Web deployments | ⚠️ Desktop focused |
| Future-Proof | ✅ Remote access capable | Local-only |

## Protocol Details

### Request Format (JSON-RPC 2.0)

```json
POST /mcp HTTP/1.1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "debrief_get_selection",
    "arguments": {
      "filename": "mission1.plot.json"
    }
  }
}
```

### Response Format

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "selectedIds": ["feature1", "feature2"]
  }
}
```

### Optional SSE Endpoint

```http
GET /mcp HTTP/1.1
Accept: text/event-stream
```

For server-initiated notifications and streaming responses.

## Consequences

### Positive

- ✅ **Fast implementation**: 3-5 days for both servers vs weeks for alternatives
- ✅ **Clean architecture**: No wrapper layers or translation code
- ✅ **Non-breaking**: Legacy WebSocket API continues working
- ✅ **Scalable**: Multiple LLM clients can connect simultaneously
- ✅ **Debuggable**: Standard HTTP requests visible in network tools

### Negative

- ⚠️ Slightly more complex than stdio for single-client scenarios (not relevant for our use case)
- ⚠️ Requires HTTP server infrastructure (already have it!)

### Risks

- **None identified** - This is the modern, recommended MCP transport

## Implementation

See implementation details in:
- [Debrief State Server Spec](../specs/debrief-state-server.md)
- [Tool Vault Server Spec](../specs/tool-vault-server.md)
- [Phase 1 Implementation Plan](../phases/phase-1-implementation.md)

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Streamable-HTTP Transport Documentation](https://spec.modelcontextprotocol.io/)
- [Main Architecture Overview](../README.md)

## Supersedes

This decision eliminates the need for:
- ❌ Stdio wrapper processes (original plan)
- ❌ SSE transport (deprecated)
- ❌ Major HTTP refactoring (already HTTP-based!)

---

**Related Decisions**: [002-github-copilot-phase1.md](002-github-copilot-phase1.md) | [003-mcp-only-tool-vault.md](003-mcp-only-tool-vault.md)
**Back to**: [Main Architecture](../README.md)
