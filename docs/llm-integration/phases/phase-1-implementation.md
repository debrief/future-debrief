# Phase 1: MCP Endpoint Implementation

**Back to**: [Main Index](../README.md) | **Duration**: 3-5 days | **Status**: 📋 Planned

---

## Goal

Add MCP streamable-http endpoints to both servers and validate with GitHub Copilot.

**Success Metric**: LLM can orchestrate multi-step maritime analysis workflows (e.g., "Delete the selected feature")

---

## Deliverables

### 1. Debrief State Server (2-3 days)

- [ ] Add Express HTTP server alongside existing WebSocket
- [ ] Implement POST `/mcp` endpoint with JSON-RPC 2.0 handler
- [ ] Implement `tools/list` method (return pre-cached tool index)
- [ ] Implement `tools/call` method routing to existing command handlers
- [ ] Generate MCP tool index at build time (`scripts/generate-mcp-tools.ts`)
- [ ] Add health check endpoint
- [ ] Error handling with JSON-RPC error codes (-32601, -32603)

**Code Locations**:
- Server: `apps/vs-code/src/services/debriefWebSocketServer.ts`
- Handler: `apps/vs-code/src/services/commandHandler.ts`
- Tool Index: `apps/vs-code/scripts/generate-mcp-tools.ts`

### 2. Tool Vault Server (1-2 days)

- [ ] Add POST `/mcp` endpoint with JSON-RPC 2.0 handler
- [ ] Implement `tools/list` method (wrap existing tool discovery)
- [ ] Implement `tools/call` method (wrap existing tool execution)
- [ ] Error handling with JSON-RPC error codes
- [ ] Update server startup to log MCP endpoint availability
- [ ] **No legacy REST API needed** - MCP-only implementation

**Code Location**: `libs/tool-vault-packager/server.py`

### 3. Python Script Integration (1 day)

- [ ] Modify `debrief_api.py` to use MCP endpoint instead of WebSocket
- [ ] Update to use JSON-RPC 2.0 request format
- [ ] Test all existing Python script workflows with new MCP client

**Code Location**: `apps/vs-code/workspace/tests/debrief_api.py`

### 4. Documentation (ongoing)

- [ ] Update GitHub Copilot configuration guide for streamable-http
- [ ] Document together.dev setup for Phase 2
- [ ] Example workflows: delete feature, filter features, update selection
- [ ] Troubleshooting guide for MCP connection issues

### 5. Testing (1 day)

- [ ] Manual testing with GitHub Copilot
- [ ] Test each MCP tool individually
- [ ] End-to-end workflow testing (multi-step operations)
- [ ] Error scenario testing (invalid requests, server unavailable)
- [ ] Multiple concurrent client testing

---

## Success Criteria

- ✅ Both servers expose `/mcp` endpoints responding to JSON-RPC 2.0
- ✅ GitHub Copilot can discover and call all tools
- ✅ Multi-step workflows execute successfully (e.g., get selection → delete → verify)
- ✅ Error responses use proper JSON-RPC error format
- ✅ Multiple LLM clients can connect simultaneously
- ✅ Python scripts (`debrief_api.py`) successfully use MCP endpoint
- ✅ Tool Vault MCP-only implementation (no legacy REST API)

---

## Implementation Tasks (Detailed)

### Debrief State Server Implementation

#### Task 1.1: Add Express HTTP Server

```typescript
// apps/vs-code/src/services/debriefStateServer.ts
import express from 'express';

const app = express();
app.use(express.json());

// Keep existing WebSocket server
const wss = new WebSocket.Server({ server: httpServer });

// Start combined server
httpServer.listen(60123, () => {
  console.log('Debrief State Server on :60123 (MCP + WebSocket)');
});
```

#### Task 1.2: Implement MCP Endpoint

```typescript
app.post('/mcp', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  try {
    switch (method) {
      case 'tools/list':
        res.json({
          jsonrpc: '2.0',
          id,
          result: { tools: mcpToolIndex.tools }
        });
        break;

      case 'tools/call':
        const result = await handleCommand(params.name, params.arguments);
        res.json({ jsonrpc: '2.0', id, result });
        break;

      default:
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error.message }
    });
  }
});
```

#### Task 1.3: Generate Tool Index at Build

```typescript
// apps/vs-code/scripts/generate-mcp-tools.ts
import fs from 'fs';

const tools = [
  {
    name: "debrief_get_selection",
    description: "Get currently selected feature IDs",
    inputSchema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Optional plot filename" }
      }
    }
  },
  {
    name: "debrief_apply_command",
    description: "Apply a DebriefCommand to update plot state",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "object", description: "DebriefCommand object" },
        filename: { type: "string" }
      },
      required: ["command"]
    }
  },
  // ... all other tools
];

fs.writeFileSync('dist/mcp-tools.json', JSON.stringify({ tools }, null, 2));
```

### Tool Vault Server Implementation

#### Task 2.1: Implement MCP Endpoint

```python
# libs/tool-vault-packager/server.py
from fastapi import FastAPI

app = FastAPI()
tools_cache = discover_tools("./tools")

@app.post("/mcp")
async def mcp_endpoint(request: dict):
    method = request.get("method")
    request_id = request.get("id")

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": [
                    {
                        "name": t["name"],
                        "description": t["description"],
                        "inputSchema": t["inputSchema"]
                    }
                    for t in tools_cache
                ]
            }
        }

    elif method == "tools/call":
        tool_name = request["params"]["name"]
        arguments = request["params"]["arguments"]
        result = await call_tool(tool_name, arguments)
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    else:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": "Method not found"}
        }
```

### Python Script Integration

#### Task 3.1: Modify debrief_api.py

```python
# apps/vs-code/workspace/tests/debrief_api.py
import requests

class DebriefClient:
    def __init__(self, base_url="http://localhost:60123"):
        self.mcp_url = f"{base_url}/mcp"
        self._request_id = 0

    def _call_mcp(self, method: str, params: dict = None):
        self._request_id += 1
        response = requests.post(self.mcp_url, json={
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {}
        })
        result = response.json()
        if "error" in result:
            raise Exception(f"MCP error: {result['error']['message']}")
        return result.get("result")

    def get_selection(self, filename=None):
        return self._call_mcp("tools/call", {
            "name": "debrief_get_selection",
            "arguments": {"filename": filename} if filename else {}
        })

    def apply_command(self, command, filename=None):
        return self._call_mcp("tools/call", {
            "name": "debrief_apply_command",
            "arguments": {"command": command, "filename": filename}
        })
```

---

## Testing Plan

### Unit Tests

- [ ] Test MCP endpoint returns proper JSON-RPC 2.0 responses
- [ ] Test each command via both WebSocket (legacy) and HTTP (new MCP)
- [ ] Test error handling for invalid JSON-RPC requests

### Integration Tests

- [ ] Test tool execution → command processing → state update flow
- [ ] Test ToolVaultCommandHandler processes commands correctly
- [ ] Test multi-plot scenarios (MULTIPLE_PLOTS error handling)
- [ ] Test Python scripts via MCP endpoint (modified debrief_api.py)

### End-to-End Tests

- [ ] Test LLM extension connects to MCP endpoint
- [ ] Test workflow: get selection → call tool → apply command → verify state
- [ ] Test GitHub Copilot integration
- [ ] Test error scenarios (server unavailable, invalid commands)

### Playwright Tests

- [ ] Add MCP endpoint smoke tests to `apps/vs-code/tests/playwright/`
- [ ] Test HTTP POST /mcp alongside existing WebSocket tests
- [ ] Verify both protocols access same underlying state

---

## GitHub Copilot Configuration

VS Code will auto-configure when Future Debrief extension starts:

```json
// .vscode/settings.json (auto-generated)
{
  "github.copilot.advanced": {
    "mcpServers": {
      "debrief-state": {
        "type": "streamable-http",
        "url": "http://localhost:60123/mcp"
      },
      "tool-vault": {
        "type": "streamable-http",
        "url": "http://localhost:60124/mcp"
      }
    }
  }
}
```

---

## Example Workflow

### User Request
"Delete the selected feature"

### LLM Orchestration

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

**Result**: Feature deleted, plot updated in real-time!

---

## Related Documentation

- [Debrief State Server Spec](../specs/debrief-state-server.md)
- [Tool Vault Server Spec](../specs/tool-vault-server.md)
- [Existing Code Impact Analysis](../specs/existing-code-impact.md)
- [ADR 001: Streamable-HTTP Transport](../decisions/001-streamable-http-transport.md)
- [ADR 002: GitHub Copilot Phase 1](../decisions/002-github-copilot-phase1.md)

---

**Back to**: [Main Index](../README.md) | **Next**: [Phase 2 Plan](phase-2-enhanced-features.md)
