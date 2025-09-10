# Debrief WebSocket Bridge - Architecture & Design

## 1. Purpose

This document defines the **architecture and design** of the WebSocket-based bridge between Python scripts and the Debrief VS Code extension. For complete API usage examples and reference, see [debrief_websocket_api.md](debrief_websocket_api.md).

---

## 2. System Architecture

### Core Components

- **WebSocket Server**: Runs inside VS Code extension process
- **Python Client**: Singleton connection manager in `debrief_api.py`
- **JSON Protocol**: Structured command/response messaging
- **Type System**: Shared state objects between Python and TypeScript

### Integration Points

- **VS Code Extension**: `src/debriefWebSocketServer.ts` - Server implementation
- **Plot JSON Editor**: Direct feature collection manipulation
- **Activity Panels**: Time, viewport, and selection state synchronization
- **File System**: Automatic plot file persistence

---

## 3. Message Structure

### From Python to VS Code

```json
{
  "command": "get_feature_collection",
  "params": {
    "filename": "alpha.geojson"
  }
}
```

### From VS Code to Python

```json
{
  "result": {
    "type": "FeatureCollection",
    "features": [ ... ]
  }
}
```

### On Error

```json
{
  "error": {
    "message": "Feature not found",
    "code": 404
  }
}
```

---

## 4. Supported Commands

| Command | Params | Returns | Description |
|--------|--------|---------|-------------|
| **Feature Collection APIs** | | | |
| `get_feature_collection` | `{ filename: str }` | `FeatureCollection` | Full plot data |
| `set_feature_collection` | `{ filename: str, data: FeatureCollection }` | `null` | Replace whole plot |
| `update_features` | `{ filename: str, features: Feature[] }` | `null` | Replace by ID |
| `add_features` | `{ filename: str, features: Feature[] }` | `null` | Add new features (auto-ID) |
| `delete_features` | `{ filename: str, ids: str[] }` | `null` | Remove by ID |
| `zoom_to_selection` | `{ filename: str }` | `null` | Adjust map view |
| `notify` | `{ message: str }` | `null` | Show VS Code notification |
| **Typed State APIs** | | | |
| `get_time` | `{ filename: str }` | `TimeState` | Current time position |
| `set_time` | `{ filename: str, timeState: TimeState }` | `null` | Update time position |
| `get_viewport` | `{ filename: str }` | `ViewportState` | Current map bounds |
| `set_viewport` | `{ filename: str, viewportState: ViewportState }` | `null` | Update map bounds |
| `get_selected_features` | `{ filename: str }` | `SelectionState` | Selected feature IDs |
| `set_selected_features` | `{ filename: str, ids: str[] }` | `null` | Update selection |

---

## 5. Type System Architecture

### State Object Design

The bridge implements **typed state objects** generated from shared JSON schemas:

- **TimeState**: Temporal plot control with current time and range
- **ViewportState**: Map bounds with coordinate validation  
- **SelectionState**: Feature selection with ID management

### Type Generation Pipeline

```
JSON Schemas (libs/shared-types/schemas/)
    ↓
TypeScript Interfaces (shared-types/derived/typescript/)
    ↓
Python Classes (shared-types/derived/python/)
    ↓
API Integration (debrief_api.py)
```

### Conversion Layer

- **Python → WebSocket**: `state_object.to_dict()` → JSON transmission
- **WebSocket → Python**: JSON response → `StateClass.from_dict()`
- **Protocol Preservation**: WebSocket JSON format unchanged

---

## 6. Connection Architecture

### WebSocket Server (VS Code Extension)
- **Location**: `src/debriefWebSocketServer.ts`
- **Port**: Fixed `localhost:60123`
- **Lifecycle**: Starts on extension activation, stops on deactivation
- **Threading**: Runs on main VS Code extension thread

### Python Client (debrief_api.py)
- **Pattern**: Singleton connection manager
- **Auto-Connect**: Connects automatically on first API call
- **Auto-Reconnect**: Handles connection failures transparently
- **Cleanup**: Automatic resource management on script exit

### Multi-Plot Filename Handling
- **Optional Filename**: Commands work without filename when single plot open
- **Multiple Plots**: Returns `MULTIPLE_PLOTS` error with available options
- **User Selection**: Interactive plot selection when ambiguous

---

## 7. Implementation Considerations

### Performance
- **Connection Reuse**: Single persistent WebSocket connection
- **Minimal Overhead**: Direct JSON serialization without additional layers
- **Batch Operations**: Supports bulk feature operations

### Error Handling
- **Structured Errors**: HTTP-style codes (400, 404, 500) with descriptive messages
- **Exception Mapping**: WebSocket errors → Python `DebriefAPIError` exceptions
- **Graceful Degradation**: Connection failures handled transparently

### File System Integration
- **Real-time Updates**: Plot changes immediately reflected in VS Code UI
- **Document Lifecycle**: Integration with VS Code document management
- **Change Detection**: Automatic file save triggers

---

## 8. Future Architecture Considerations

### Planned Enhancements
- **Async API**: Python `asyncio` support for non-blocking operations
- **Bidirectional Events**: Push notifications from VS Code to Python
- **Authentication**: Access control for production deployments
- **Performance**: Connection pooling and multiplexed channels

### Testing Strategy
- **Unit Tests**: Individual command validation
- **Integration Tests**: Full Python ↔ VS Code workflow testing
- **Error Simulation**: Connection failures and invalid data handling
- **Performance Tests**: Large dataset and concurrent operation testing

---

## 9. Related Documentation

- **[API Reference](debrief_websocket_api.md)**: Complete Python API usage guide
- **[Extension README](../README.md)**: VS Code extension setup and development
- **[Shared Types](../../libs/shared-types/README.md)**: Type system architecture

---

*End of Document*