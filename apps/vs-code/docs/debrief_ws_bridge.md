# Debrief WebSocket Bridge Design

## 1. Purpose

This document defines a WebSocket-based bridge between Python scripts and the Debrief VS Code extension. It allows Python code — including scripts launched via F5 — to interact with open Debrief plots through a clean, command-based API.

---

## 2. Overview

- The WebSocket server runs **inside the Debrief VS Code extension**
- It starts on extension activation and listens on a fixed port (e.g., `ws://localhost:60123`)
- The Python client connects automatically via `debrief_api.py`
- Commands are serialized as JSON messages and all return structured JSON responses
- Errors are raised as Python exceptions (`DebriefAPIError`)

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
| `get_feature_collection` | `{ filename: str }` | `FeatureCollection` | Full plot data |
| `set_feature_collection` | `{ filename: str, data: FeatureCollection }` | `null` | Replace whole plot |
| `get_selected_features` | `{ filename: str }` | `Feature[]` | Currently selected features |
| `set_selected_features` | `{ filename: str, ids: str[] }` | `null` | Change selection (empty = clear) |
| `update_features` | `{ filename: str, features: Feature[] }` | `null` | Replace by ID |
| `add_features` | `{ filename: str, features: Feature[] }` | `null` | Add new features (auto-ID) |
| `delete_features` | `{ filename: str, ids: str[] }` | `null` | Remove by ID |
| `zoom_to_selection` | `{ filename: str }` | `null` | Adjust map view |
| `notify` | `{ message: str }` | `null` | Show VS Code notification |

---

## 5. Python API Design

### Module: `debrief_api.py`

```python
def get_feature_collection(filename: str) -> dict: ...
def set_feature_collection(filename: str, fc: dict): ...
def get_selected_features(filename: str) -> list[dict]: ...
def set_selected_features(filename: str, ids: list[str]): ...
def update_features(filename: str, features: list[dict]): ...
def add_features(filename: str, features: list[dict]): ...
def delete_features(filename: str, ids: list[str]): ...
def zoom_to_selection(filename: str): ...
def notify(message: str): ...
```

### Error Handling

```python
from debrief_api import DebriefAPIError

try:
    fc = get_feature_collection("test.geojson")
except DebriefAPIError as e:
    print(f"Error: {e}")
```

---

## 6. Connection Management

- Python module maintains a singleton WebSocket connection
- Automatically connects on first use and reconnects on failure
- Cleans up on script exit (where possible)
- Single-client support for now

---

## 7. Future Enhancements

- Async API support (`async def get_feature_collection_async`) via `asyncio`
- Bidirectional messaging (push updates to Python)
- Authentication or access control (if needed)
- Multiplexed plot-aware channels (one per plot)

---

## 8. Testing Plan

- Create mock Python scripts calling each command
- Simulate VS Code-side errors (invalid file, bad JSON)
- Run multiple sequential calls in a script to confirm connection reuse
- Confirm feature updates reflect live in UI

---

End of Document