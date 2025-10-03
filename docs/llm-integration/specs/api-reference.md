# API Reference

**Back to**: [Main Index](../README.md) | **Related**: [Debrief State Server](debrief-state-server.md) | [Tool Vault Server](tool-vault-server.md)

---

## MCP JSON-RPC Request Format

All MCP requests use JSON-RPC 2.0 protocol:

```json
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

---

## MCP JSON-RPC Response Format

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Selected features: [\"feature1\", \"feature2\"]"
      }
    ]
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "Plot file not found or not open",
    "data": {
      "filename": "mission1.plot.json"
    }
  }
}
```

---

## JSON-RPC Error Codes

```typescript
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,      // Invalid JSON
  INVALID_REQUEST: -32600,  // Invalid request object
  METHOD_NOT_FOUND: -32601, // Method does not exist
  INVALID_PARAMS: -32602,   // Invalid method parameters
  INTERNAL_ERROR: -32603,   // Internal server error

  // Application-specific codes
  MULTIPLE_PLOTS: -32001,   // Multiple plots open (user must specify)
  PLOT_NOT_FOUND: -32002,   // Plot file not found or not open
  FEATURE_NOT_FOUND: -32003 // Feature ID not found
};
```

---

## Debrief State Server Tools

### `debrief_get_features`

Get all features from the active plot.

**Request**:
```json
{
  "name": "debrief_get_features",
  "arguments": {
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Response**: FeatureCollection object

---

### `debrief_get_selection`

Get currently selected feature IDs.

**Request**:
```json
{
  "name": "debrief_get_selection",
  "arguments": {
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Response**: Array of feature ID strings

---

### `debrief_set_selection`

Update selected features.

**Request**:
```json
{
  "name": "debrief_set_selection",
  "arguments": {
    "selectedIds": ["feature1", "feature2"],
    "filename": "mission1.plot.json"  // Optional
  }
}
```

---

### `debrief_apply_command`

Apply a DebriefCommand result to update plot state.

**Request**:
```json
{
  "name": "debrief_apply_command",
  "arguments": {
    "command": {
      "command": "setFeatureCollection",
      "payload": { "features": [...] }
    },
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Command Types**:
- `setFeatureCollection` - Update entire feature collection
- `showText` - Display notification to user
- `highlightFeatures` - Select/highlight specific features
- `updateViewport` - Adjust map viewport

---

## Tool Vault Tools

Tool Vault tools are discovered dynamically. Use `tools/list` to see available maritime analysis tools.

**Example Tool Execution**:
```json
{
  "name": "delete_features",
  "arguments": {
    "ids": ["feature1"]
  }
}
```

**Returns**: DebriefCommand object for state updates

---

**Back to**: [Main Index](../README.md)
