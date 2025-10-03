# Frequently Asked Questions

**Back to**: [Main Index](../README.md)

---

## General Questions

### What is MCP?

**Model Context Protocol (MCP)** is an open-source standard for AI-tool integrations that enables LLM extensions to access external tools, databases, and APIs.

- **Official Site**: https://modelcontextprotocol.io/
- **Transport**: We use streamable-http (modern, HTTP-based)
- **Protocol**: JSON-RPC 2.0 for command/response

---

### Why streamable-http instead of stdio?

**streamable-http advantages**:
- ✅ Leverages existing HTTP servers (ports 60123, 60124)
- ✅ Multiple concurrent clients (GitHub Copilot + together.dev simultaneously)
- ✅ Production-ready (designed for web applications)
- ✅ No process management overhead

**stdio limitations**:
- ❌ 1:1 client-server only
- ❌ Requires process lifecycle management
- ❌ Desktop app focused (not production-ready)

---

### Why GitHub Copilot for Phase 1?

**Copilot advantages**:
- ✅ Built into VS Code (no additional installation)
- ✅ Easy setup (just GitHub authentication)
- ✅ Fast validation of MCP integration
- ✅ Good user experience

**Trade-offs**:
- ⚠️ Requires internet connection
- ⚠️ Subscription cost
- ⚠️ Data sent to cloud

**Phase 2** will add together.dev for offline/local operation.

---

### Why together.dev for Phase 2?

**together.dev advantages**:
- ✅ 100% local operation (no internet required)
- ✅ No data leaves machine (security/privacy)
- ✅ No subscription costs
- ✅ Works in classified/offline environments

---

## Technical Questions

### Do I need to refactor WebSocket to HTTP?

**No!** The streamable-http approach:
- ✅ Adds `/mcp` endpoint to existing servers
- ✅ Keeps WebSocket API unchanged
- ✅ Both protocols use shared command handlers
- ✅ Non-breaking change

---

### What is a DebriefCommand?

**DebriefCommand** is a universal command protocol for plot manipulation:

- **Produced by**: Tool Vault tools, user scripts, LLM-generated code
- **Applied to**: Debrief State Server
- **Command Types**: `setFeatureCollection`, `showText`, `highlightFeatures`, `updateViewport`

**Note**: Currently named `ToolVaultCommand` in schemas (will be refactored).

---

### How do I handle multiple open plots?

**Two approaches**:

1. **Explicit filename** (preferred):
   ```typescript
   await callTool('debrief_get_selection', {
     filename: 'mission1.plot.json'
   });
   ```

2. **Handle MULTIPLE_PLOTS error**:
   - Server returns error with available plots
   - LLM prompts user to select
   - Retry with specified filename

---

### What about authentication?

**Phase 1**: No authentication needed
- Services bound to localhost only
- VS Code extension manages lifecycle
- LLM runs with user's permissions

**Future** (Phase 2+):
- Optional API key authentication
- Audit logging
- Rate limiting

See [Authentication](authentication.md) for details.

---

## Implementation Questions

### How long does Phase 1 take?

**Timeline**: 3-5 days

**Breakdown**:
- Day 1-3: Add MCP endpoints to both servers
- Day 4: Integration testing
- Day 5: Documentation and validation

See [Phase 1 Implementation](../phases/phase-1-implementation.md).

---

### Do I need to modify Python scripts?

**Yes**, but minimal changes:

**Old** (WebSocket):
```python
from debrief_api import debrief
debrief.get_selection()
```

**New** (MCP):
```python
from debrief_api import debrief
debrief.get_selection()  # Same API, uses MCP internally
```

The `debrief_api.py` module will be updated to use MCP endpoint instead of WebSocket.

---

### What about Tool Vault?

**Tool Vault is MCP-only** from the start:
- No legacy REST API to maintain
- Clean MCP-native implementation
- Just add `/mcp` endpoint to FastAPI server

---

## Troubleshooting

### LLM can't find MCP servers

**Check**:
1. VS Code extension running?
2. Ports 60123/60124 not blocked?
3. MCP configuration in VS Code settings?

See [Troubleshooting Guide](troubleshooting.md).

---

### Tools not appearing in GitHub Copilot

**Solutions**:
1. Restart VS Code after config changes
2. Verify `github.copilot.advanced.mcpServers` in settings.json
3. Check internet connection (Copilot is cloud-based)

---

## Workflow Questions

### Example: Delete selected feature?

```typescript
// Step 1: Get selection
const selection = await callTool('debrief_get_selection', {});

// Step 2: Delete via Tool Vault
const result = await callBash(
  `python toolvault.pyz call-tool delete_features '{"ids": ["${selection[0]}"]}'`
);

// Step 3: Apply result
await callTool('debrief_apply_command', {
  command: result
});
```

See [User Workflows](user-workflows.md) for more examples.

---

**Back to**: [Main Index](../README.md)
