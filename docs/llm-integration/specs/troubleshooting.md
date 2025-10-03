# Troubleshooting Guide

**Back to**: [Main Index](../README.md)

---

## Common Issues

### MCP Server Not Found

**Symptom**: LLM extension reports "Server not available" or similar error.

**Solutions**:
1. Verify Future Debrief VS Code extension is running
2. Check ports 60123 and 60124 are not blocked
3. Verify MCP configuration in VS Code settings
4. Check VS Code Debug Console for server startup errors

---

### Connection Failures

**Scenario**: WebSocket server not running

**Error Pattern**:
```typescript
try {
  await connectWebSocket('ws://localhost:60123');
} catch (error) {
  if (error instanceof WebSocketConnectionError) {
    return {
      error: {
        code: -32003,
        message: "Debrief WebSocket server not available. Ensure VS Code extension is running.",
        data: { port: 60123 }
      }
    };
  }
  throw error;
}
```

**Solutions**:
- Restart VS Code extension
- Check Debug Console for errors
- Verify no other process using port 60123/60124

---

### Tool Execution Failures

**Scenario**: Tool Vault returns error

**Error Pattern**:
```typescript
const result = await callToolVault('word_count', { text: 'hello' });

if (result.isError) {
  return {
    error: {
      code: -32004,
      message: `Tool execution failed: ${result.error}`,
      data: { toolName: 'word_count', originalError: result.error }
    }
  };
}
```

**Solutions**:
- Verify tool name is correct (use `tools/list`)
- Check input parameters match schema
- Review tool-specific error message

---

### Multiple Plots Open

**Error Response**:
```json
{
  "error": {
    "code": -32001,
    "message": "Multiple plots open, please specify filename",
    "data": {
      "available_plots": [
        { "filename": "mission1.plot.json", "title": "Mission 1" },
        { "filename": "mission2.plot.json", "title": "Mission 2" }
      ]
    }
  }
}
```

**Solution**: Add `filename` parameter to tool call

---

### Service Unavailable

**Setup**: Stop WebSocket server (simulate crash)

**Expected Behavior**:
1. LLM calls `debrief_get_selection({})`
2. State Server attempts WebSocket connection
3. Connection fails after retries
4. State Server returns CONNECTION_FAILED error
5. LLM responds: "Cannot connect to Debrief. Please ensure VS Code extension is running."

**Validation**:
- ✅ Clear error message with remediation steps
- ✅ No exceptions thrown
- ✅ MCP server remains operational (reconnects when service restored)

---

## GitHub Copilot Specific

### Tools Not Appearing

**Check**:
1. VS Code settings.json contains `github.copilot.advanced.mcpServers` configuration
2. Restart VS Code after config changes
3. Verify internet connection (Copilot is cloud-based)

---

## together.dev Specific (Phase 2)

### Local LLM Not Connecting

**Check** (TBD Phase 2):
1. Local LLM backend running
2. together.dev extension configured correctly
3. MCP servers accessible from local LLM process

---

**Back to**: [Main Index](../README.md)
