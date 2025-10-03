# ADR 004: Python Scripts Use MCP Endpoint

**Status**: ✅ Accepted
**Date**: 2025-10-03
**Context**: [LLM Integration Architecture](../README.md)

## Context

Naval analysts write Python scripts in `workspace/` directory to automate maritime analysis. Current implementation uses `debrief_api.py` client that communicates via **WebSocket** to the Debrief State Server (port 60123).

With MCP integration, we now have two protocols:
- WebSocket (legacy) - existing Python scripts
- MCP/HTTP (new) - LLM extensions

## Decision

**Modify `debrief_api.py` to use MCP endpoint** (HTTP POST /mcp) instead of WebSocket.

All user Python scripts will use the same protocol as LLM extensions.

## Rationale

### Protocol Unification

1. **Single Protocol for All Clients**
   ```
   Before:
   - LLM extensions → HTTP POST /mcp
   - Python scripts → WebSocket

   After:
   - LLM extensions → HTTP POST /mcp
   - Python scripts → HTTP POST /mcp
   ```

2. **Consistency**
   - Same JSON-RPC 2.0 format
   - Same error handling
   - Same authentication (if added later)
   - Same debugging tools

3. **Simpler Mental Model**
   - Analysts learn one protocol
   - LLM-generated Python scripts use same API
   - No protocol translation needed

### Technical Benefits

1. **HTTP is Simpler Than WebSocket**
   ```python
   # Before (WebSocket - complex)
   import websockets

   async with websockets.connect('ws://localhost:60123') as ws:
       await ws.send(json.dumps(request))
       response = await ws.recv()

   # After (HTTP - simple)
   import requests

   response = requests.post('http://localhost:60123/mcp', json=request)
   ```

2. **Better Tooling**
   - Use `curl` for testing
   - Browser network tab works
   - Standard HTTP debugging tools
   - Python `requests` library (simpler than `websockets`)

3. **Stateless Requests**
   - No connection management needed
   - Auto-retry on failure easier
   - No reconnection logic

### Alignment with LLM Integration

1. **LLM-Generated Scripts**
   When LLMs generate Python code, it uses the same `debrief_api.py`:
   ```python
   # LLM-generated script
   from debrief_api import debrief

   # Get current selection
   selection = debrief.get_selection()

   # Call maritime analysis tool
   result = debrief.call_tool("word_count", {"text": "..."})

   # Apply result
   debrief.apply_command(result)
   ```

2. **Consistent Behavior**
   - Scripts written by analysts work like LLM-generated scripts
   - No "human API" vs "LLM API" confusion
   - Easier to debug and troubleshoot

## Implementation

### Modified `debrief_api.py`

```python
# apps/vs-code/workspace/tests/debrief_api.py

import requests
from typing import Any, Dict, List, Optional

class DebriefClient:
    """Python client for Debrief MCP endpoint."""

    def __init__(self, base_url: str = "http://localhost:60123"):
        self.base_url = base_url
        self.mcp_url = f"{base_url}/mcp"
        self._request_id = 0

    def _call_mcp(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Make MCP JSON-RPC 2.0 request."""
        self._request_id += 1

        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {}
        }

        response = requests.post(self.mcp_url, json=request)
        response.raise_for_status()

        result = response.json()

        if "error" in result:
            raise Exception(f"MCP error: {result['error']['message']}")

        return result.get("result")

    def get_selection(self, filename: Optional[str] = None) -> List[str]:
        """Get selected feature IDs."""
        result = self._call_mcp("tools/call", {
            "name": "debrief_get_selection",
            "arguments": {"filename": filename} if filename else {}
        })
        return result.get("selectedIds", [])

    def get_features(self, filename: Optional[str] = None) -> Dict[str, Any]:
        """Get feature collection."""
        return self._call_mcp("tools/call", {
            "name": "debrief_get_features",
            "arguments": {"filename": filename} if filename else {}
        })

    def apply_command(self, command: Dict[str, Any], filename: Optional[str] = None) -> Dict[str, Any]:
        """Apply a DebriefCommand to update plot state."""
        return self._call_mcp("tools/call", {
            "name": "debrief_apply_command",
            "arguments": {
                "command": command,
                "filename": filename
            } if filename else {"command": command}
        })

# Singleton instance
debrief = DebriefClient()
```

### Backward Compatibility

**No legacy WebSocket API in Python scripts** - clean break since:
- Not in production yet
- Existing test scripts can be updated quickly
- MCP API is simpler and better

### Migration Checklist

- [ ] Update `debrief_api.py` to MCP client implementation
- [ ] Update all test scripts in `workspace/tests/`
- [ ] Update documentation with MCP examples
- [ ] Remove WebSocket client code
- [ ] Verify all workflows still work

## Consequences

### Positive

- ✅ **Protocol consistency**: Same API for LLMs and analysts
- ✅ **Simpler client code**: HTTP easier than WebSocket
- ✅ **Better tooling**: Standard HTTP debugging
- ✅ **Stateless**: No connection management complexity
- ✅ **Future-proof**: MCP is the standard protocol

### Negative

- ⚠️ **Breaking change for test scripts**: Need to update existing scripts
  - **Mitigation**: Small number of scripts, easy to update

### Neutral

- WebSocket still exists for VS Code extension internal communication
- Debrief State Server maintains dual interface (MCP + WebSocket)

## User Script Examples

### Before (WebSocket)

```python
import asyncio
import websockets
import json

async def delete_selected():
    async with websockets.connect('ws://localhost:60123') as ws:
        # Get selection
        await ws.send(json.dumps({
            "command": "get_selected_features",
            "params": {}
        }))
        response = json.loads(await ws.recv())
        feature_ids = response["result"]

        # Delete features
        await ws.send(json.dumps({
            "command": "delete_features",
            "params": {"ids": feature_ids}
        }))
        await ws.recv()

asyncio.run(delete_selected())
```

### After (MCP)

```python
from debrief_api import debrief

def delete_selected():
    # Get selection
    feature_ids = debrief.get_selection()

    # Delete features (via Tool Vault)
    # ... deletion logic

    print(f"Deleted {len(feature_ids)} features")

delete_selected()
```

**Much simpler!** No async/await, no connection management, no JSON encoding.

## TypeScript/JavaScript Scripts

**Not Supported** - analysts write Python only. No TypeScript/JS custom tools needed.

## References

- [Debrief State Server Spec](../specs/debrief-state-server.md)
- [Python Client API Reference](../specs/api-reference.md#python-client)
- [ADR 001: Streamable-HTTP Transport](001-streamable-http-transport.md)
- [ADR 003: MCP-Only Tool Vault](003-mcp-only-tool-vault.md)

## Related Work

- [Existing Code Impact Analysis](../specs/existing-code-impact.md)
- [Phase 1 Implementation](../phases/phase-1-implementation.md)
- [Testing Strategy](../specs/testing-strategy.md)

---

**Back to**: [Main Architecture](../README.md) | [All Decisions](../README.md#key-decisions)
