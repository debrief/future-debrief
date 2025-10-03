# Integration Patterns

**Back to**: [Main Index](../README.md)

---

## Multi-Step Workflow Pattern

LLMs orchestrate complex workflows by chaining MCP tool calls:

### Example: Delete Selected Feature

1. **Get Selection**
   ```json
   POST /mcp
   {"method": "tools/call", "params": {"name": "debrief_get_selection"}}
   → {"result": {"selectedIds": ["feature123"]}}
   ```

2. **Call Tool Vault**
   ```json
   POST http://localhost:60124/mcp
   {"method": "tools/call", "params": {
     "name": "delete_features",
     "arguments": {"ids": ["feature123"]}
   }}
   → {"result": {"command": "setFeatureCollection", "payload": {...}}}
   ```

3. **Apply Command**
   ```json
   POST /mcp
   {"method": "tools/call", "params": {
     "name": "debrief_apply_command",
     "arguments": {"command": <ToolVaultCommand>}
   }}
   → {"result": {"success": true}}
   ```

---

## Universal Command Protocol

**DebriefCommand** is the universal integration point:

```typescript
{
  "command": "setFeatureCollection" | "showText" | "highlightFeatures" | "updateViewport",
  "payload": { /* command-specific data */ }
}
```

**Producers**:
- Tool Vault maritime analysis tools
- User Python scripts (via `debrief_api.py`)
- LLM-generated code

All produce same format → processed by `ToolVaultCommandHandler`.

---

**Back to**: [Main Index](../README.md)
