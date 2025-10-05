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

## Phase 2: Enhanced MCP Tools Troubleshooting

### Invalid Time State Errors

**Symptom**: Error like "TimeState.current is not a valid ISO 8601 date-time"

**Common Causes**:
1. Invalid date format (e.g., "2025-13-45" - invalid month/day)
2. Time outside of range (current < start or current > end)
3. Start time after end time

**Solutions**:
- Use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Ensure current time is between start and end
- Verify start ≤ end

**Example Fix**:
```typescript
// ❌ Wrong
{ current: "2025-13-45T12:00:00Z" }

// ✅ Correct
{ current: "2025-10-05T12:00:00Z" }
```

---

### Invalid Viewport Bounds Errors

**Symptom**: Error like "ViewportState.bounds[1] (south) must be between -90 and 90 degrees"

**Common Causes**:
1. Wrong array length (not exactly 4 elements)
2. Latitude out of range (-90 to 90)
3. Longitude out of range (-180 to 180)
4. South > North (except antimeridian crossing)

**Solutions**:
- Use format: `[west, south, east, north]`
- Check latitude: -90 ≤ lat ≤ 90
- Check longitude: -180 ≤ lng ≤ 180
- Ensure south ≤ north

**Example Fix**:
```typescript
// ❌ Wrong: South > North
{ bounds: [-10, 60, 2, 50] }

// ✅ Correct
{ bounds: [-10, 50, 2, 60] }

// ✅ Also Correct: Antimeridian crossing (west > east OK for Pacific)
{ bounds: [170, 50, -170, 58] }
```

---

### WebSocket Connection Error (-32000)

**Error**: "Could not connect to plot. Is a .plot.json file open?"

**Symptoms**:
- Operations fail with -32000 error code
- Map doesn't update

**Solutions**:
1. **Verify plot file is open**: Open a `.plot.json` file in VS Code
2. **Check WebSocket server**: Run `lsof -i :60123` to verify bridge is running
3. **Reload VS Code**: Cmd+Shift+P → "Developer: Reload Window"
4. **Check extension logs**: Look for WebSocket startup errors

**Debug Commands**:
```bash
# Check if WebSocket is running
lsof -i :60123

# If not running, check extension logs in VS Code
# Open Debug Console and filter for "WebSocket" or "Debrief"
```

---

### Multiple Plots Error (-32005)

**Error**: "Multiple plot files are open. Please specify which file to use."

**When It Happens**:
- 2+ `.plot.json` files are open
- Operation doesn't specify `filename` parameter

**Solution**: Add filename to request

**Example**:
```json
// ❌ Ambiguous (multiple plots open)
{
  "name": "debrief_get_time",
  "arguments": {}
}

// ✅ Specific
{
  "name": "debrief_get_time",
  "arguments": {
    "filename": "atlantic.plot.json"
  }
}
```

**How GitHub Copilot Handles This**:
1. Receives error with `available_plots` list
2. Asks user: "Which plot? atlantic.plot.json or pacific.plot.json?"
3. Retries with specified filename

---

### Tool Not Found Errors

**Symptom**: Error "Method not found" or tool doesn't appear in Copilot

**Check**:
1. **Tool is implemented**: Verify tool exists in `apps/vs-code/src/services/debriefHttpServer.ts`
2. **MCP endpoint registered**: Check `/mcp` endpoint handles the tool
3. **Tool name matches**: Verify exact spelling (case-sensitive)

**Phase 2 Tools**:
- `debrief_get_time` ✓
- `debrief_set_time` ✓
- `debrief_get_viewport` ✓
- `debrief_set_viewport` ✓
- `debrief_list_plots` ✓
- `debrief_zoom_to_selection` ✓

---

### Slow Performance

**Symptom**: Operations take >5 seconds

**Performance Targets**:
- Get operations: <200ms p95
- Set operations: <500ms p95
- Multi-step workflows: <5s p95

**Troubleshooting**:
1. **Check network**: Ensure low latency to VS Code
2. **Reduce complexity**: Break multi-step workflows into smaller parts
3. **Check concurrent operations**: Limit to 5 simultaneous requests
4. **Review logs**: Look for retry attempts or timeouts

**Debug Performance**:
```javascript
// In Chrome DevTools Console
console.time('operation');
// ... perform Copilot interaction ...
console.timeEnd('operation');
```

---

### Map Not Updating

**Symptom**: Commands succeed but map doesn't change

**Solutions**:
1. **Verify plot is focused**: Click on .plot.json editor tab
2. **Check browser console**: Open webview DevTools for JavaScript errors
3. **Reload editor**: Close and reopen .plot.json file
4. **Clear browser cache**: Reload webview with Cmd+R

**Verification**:
- Check VS Code Output panel for WebSocket messages
- Verify state update messages are sent
- Check globalController logs

---

## together.dev Specific (Phase 2)

### Local LLM Not Connecting

**Check** (TBD Phase 2):
1. Local LLM backend running
2. together.dev extension configured correctly
3. MCP servers accessible from local LLM process

---

## Advanced Debugging

### Enable Detailed Logging

Add to VS Code settings.json:
```json
{
  "debrief.debug.logLevel": "debug",
  "debrief.debug.logWebSocket": true,
  "debrief.debug.logMCP": true
}
```

### Inspect MCP Messages

Check raw JSON-RPC messages:
```typescript
// In extension code (debriefHttpServer.ts)
console.warn('[MCP Request]', JSON.stringify(req.body, null, 2));
console.warn('[MCP Response]', JSON.stringify(response, null, 2));
```

### Test Without Copilot

Use curl to test MCP endpoints directly:
```bash
curl -X POST http://localhost:60124/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "debrief_get_time",
      "arguments": {}
    }
  }'
```

---

**Back to**: [Main Index](../README.md) | **See Also**: [Error Handling](error-handling.md) | [API Reference](api-reference.md)

**Version**: 1.1 (Phase 2 Enhanced)
**Last Updated**: 2025-10-05
