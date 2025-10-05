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
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR: -32700,      // Invalid JSON
  INVALID_REQUEST: -32600,  // Invalid request object
  METHOD_NOT_FOUND: -32601, // Method does not exist
  INVALID_PARAMS: -32602,   // Invalid method parameters
  INTERNAL_ERROR: -32603,   // Internal server error

  // Phase 2 Enhanced MCP Error Codes (-32000 to -32099)
  WEBSOCKET_CONNECTION_ERROR: -32000,  // Failed to connect to WebSocket bridge
  TOOL_VAULT_ERROR: -32001,            // Tool Vault service unavailable
  INVALID_PARAMETER_ERROR: -32002,     // Input validation failed
  RETRY_EXHAUSTED_ERROR: -32003,       // Max retries exceeded
  RESOURCE_NOT_FOUND_ERROR: -32004,    // Resource (plot, feature, etc.) not found
  MULTIPLE_PLOTS_ERROR: -32005,        // Multiple plots open (user must specify)

  // Legacy codes (deprecated, use new Phase 2 codes)
  MULTIPLE_PLOTS: -32001,   // Deprecated: Use MULTIPLE_PLOTS_ERROR (-32005)
  PLOT_NOT_FOUND: -32002,   // Deprecated: Use RESOURCE_NOT_FOUND_ERROR (-32004)
  FEATURE_NOT_FOUND: -32003 // Deprecated: Use RESOURCE_NOT_FOUND_ERROR (-32004)
};
```

### Error Response Examples

#### WebSocket Connection Error
```json
{
  "error": {
    "code": -32000,
    "message": "Could not connect to plot. Is a .plot.json file open?"
  }
}
```

#### Invalid Parameter Error (Time State)
```json
{
  "error": {
    "code": -32002,
    "message": "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45T12:00:00Z"
  }
}
```

#### Invalid Parameter Error (Viewport Bounds)
```json
{
  "error": {
    "code": -32002,
    "message": "ViewportState.bounds[3] (north) must be between -90 and 90 degrees, got 95"
  }
}
```

#### Multiple Plots Error
```json
{
  "error": {
    "code": -32005,
    "message": "Multiple plot files are open. Please specify which file to use.",
    "data": {
      "available_plots": [
        {"filename": "mission1.plot.json", "title": "Mission 1"},
        {"filename": "mission2.plot.json", "title": "Mission 2"}
      ]
    }
  }
}
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

## Phase 2 Enhanced MCP Tools

### `debrief_get_time`

Get current time state from the plot.

**Request**:
```json
{
  "name": "debrief_get_time",
  "arguments": {
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"current\":\"2025-10-05T12:00:00Z\",\"start\":\"2025-10-05T10:00:00Z\",\"end\":\"2025-10-05T14:00:00Z\",\"isPlaying\":false}"
  }]
}
```

**TimeState Fields**:
- `current` (string): Current time in ISO 8601 format
- `start` (string): Time range start
- `end` (string): Time range end
- `isPlaying` (boolean): Whether time slider is playing

---

### `debrief_set_time`

Set the current time in the plot.

**Request**:
```json
{
  "name": "debrief_set_time",
  "arguments": {
    "timeState": {
      "current": "2025-10-05T12:30:00Z",
      "start": "2025-10-05T10:00:00Z",
      "end": "2025-10-05T14:00:00Z"
    },
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Validation Rules**:
- All times must be valid ISO 8601 date-time strings
- `current` must be between `start` and `end`
- `start` must be before or equal to `end`

**Error Examples**:
- Invalid format: "TimeState.current is not a valid ISO 8601 date-time: 2025-13-45"
- Out of range: "TimeState.current must be between start and end times"

---

### `debrief_get_viewport`

Get current map viewport bounds and zoom level.

**Request**:
```json
{
  "name": "debrief_get_viewport",
  "arguments": {
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"bounds\":[-10,50,2,58],\"zoom\":7,\"center\":{\"lat\":54,\"lng\":-4}}"
  }]
}
```

**ViewportState Fields**:
- `bounds` (array): `[west, south, east, north]` in degrees
- `zoom` (number): Zoom level (0-20)
- `center` (object): `{lat, lng}` center point

---

### `debrief_set_viewport`

Set the map viewport bounds and zoom level.

**Request**:
```json
{
  "name": "debrief_set_viewport",
  "arguments": {
    "viewportState": {
      "bounds": [-10, 50, 2, 58]
    },
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Validation Rules**:
- `bounds` must be array of 4 numbers: `[west, south, east, north]`
- Latitude (south, north) must be between -90 and 90 degrees
- Longitude (west, east) must be between -180 and 180 degrees
- `south` must be ≤ `north`
- `west` may be > `east` for antimeridian crossing (Pacific region)

**Error Examples**:
- "ViewportState.bounds must have exactly 4 elements [west, south, east, north], got 3"
- "ViewportState.bounds[1] (south) must be between -90 and 90 degrees, got -95"
- "ViewportState.bounds: south (60) must be less than or equal to north (50)"

---

### `debrief_list_plots`

List all open plot files (for multi-plot scenarios).

**Request**:
```json
{
  "name": "debrief_list_plots",
  "arguments": {}
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "[{\"filename\":\"atlantic.plot.json\",\"title\":\"Atlantic Ocean Plot\",\"isActive\":true},{\"filename\":\"pacific.plot.json\",\"title\":\"Pacific Ocean Plot\",\"isActive\":false}]"
  }]
}
```

**Plot Object Fields**:
- `filename` (string): Plot file name
- `title` (string): Plot title from properties
- `isActive` (boolean): Whether plot is currently focused

---

### `debrief_zoom_to_selection`

Zoom map to show all selected features.

**Request**:
```json
{
  "name": "debrief_zoom_to_selection",
  "arguments": {
    "padding": 15,  // Optional, default 15%
    "filename": "mission1.plot.json"  // Optional
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"success\":true,\"bounds\":[-10,50,2,58],\"zoom\":7,\"message\":\"Zoomed to 3 selected features\"}"
  }]
}
```

**Behavior**:
1. Gets currently selected features
2. Calculates bounding box from feature coordinates
3. Adds padding percentage (default 15%)
4. Sets viewport to calculated bounds
5. Returns updated viewport state

**Edge Cases**:
- No selection: Returns error "No features selected"
- Single point: Zooms to reasonable level around point
- Features spanning large area: Fits all features with padding

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
