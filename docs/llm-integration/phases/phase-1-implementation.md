# Phase 1: MCP Endpoint Implementation

**Back to**: [Main Index](../README.md) | **Duration**: 5-7 days | **Status**: 🔄 ~60% Complete

**📊 Detailed Progress**: See [STATUS.md](../STATUS.md)

---

## Goal

Add MCP streamable-http endpoints to both servers and validate with GitHub Copilot.

**Success Metric**: LLM can orchestrate multi-step maritime analysis workflows (e.g., "Delete the selected feature")

---

## Phase 1 Progress Summary

### ✅ Completed: Foundation Infrastructure (3-4 days)

**PR #217** (Oct 4, 2025): HTTP Transport Migration
- ✅ Migrated Debrief Server from WebSocket → HTTP
- ✅ Express server on port 60123 with POST / endpoint
- ✅ Health check endpoint GET /health
- ✅ Python client migrated from websocket-client → requests
- ✅ All command handlers preserved and tested

**Issue #215** (Oct 4, 2025): Server Infrastructure
- ✅ ServerLifecycleManager with start/stop/restart
- ✅ Server status bar indicators in VS Code
- ✅ Health monitoring with 5-second polling
- ✅ Error types and recovery patterns

**Benefits**:
- HTTP foundation ready for MCP protocol layer
- Server health monitoring production-ready
- Lifecycle management tested and stable

### 🔄 In Progress: MCP Protocol Layer (3-4 days remaining)

**Remaining Tasks**:
- Add POST /mcp endpoints with JSON-RPC 2.0 protocol
- Generate MCP tool indexes
- Convert Python client to MCP format
- GitHub Copilot integration testing

---

## Deliverables

### 1. Debrief State Server (2-3 days remaining)

**✅ Completed** (PR #217):
- ✅ Express HTTP server on port 60123
- ✅ POST / endpoint with custom JSON command format
- ✅ Health check endpoint GET /health
- ✅ Command handlers ready and tested
- ✅ 50MB JSON payload limit for large feature collections

**🔄 Remaining**:
- [ ] Implement POST `/mcp` endpoint with JSON-RPC 2.0 handler
- [ ] Implement `tools/list` method (return pre-cached tool index)
- [ ] Implement `tools/call` method routing to existing command handlers
- [ ] Generate MCP tool index at build time (`scripts/generate-mcp-tools.ts`)
- [ ] Error handling with JSON-RPC error codes (-32601, -32603)

**Code Locations**:
- Server: `apps/vs-code/src/services/debriefHttpServer.ts` (renamed from debriefWebSocketServer.ts)
- Handler: `apps/vs-code/src/services/commandHandler.ts`
- Tool Index: `apps/vs-code/scripts/generate-mcp-tools.ts` (NEW - to be created)
- Lifecycle: `apps/vs-code/src/services/ServerLifecycleManager.ts` (DONE)

### 2. Tool Vault Server (1-2 days remaining)

**✅ Completed** (Existing):
- ✅ FastAPI HTTP server on port 60124
- ✅ REST endpoints: GET /tools/list, POST /tools/call
- ✅ Health check endpoint GET /health
- ✅ Dynamic tool discovery from tools/ directory
- ✅ Tool execution with parameter validation
- ✅ React SPA integration at /ui/

**🔄 Remaining**:
- [ ] Add POST `/mcp` endpoint with JSON-RPC 2.0 handler
- [ ] Implement `tools/list` method (wrap existing tool discovery)
- [ ] Implement `tools/call` method (wrap existing tool execution)
- [ ] Error handling with JSON-RPC error codes
- [ ] Update server startup to log MCP endpoint availability
- [ ] **Keep existing REST endpoints for SPA** (NOT MCP-only as originally planned)

**Code Location**: `libs/tool-vault-packager/server.py`

**Architecture Change**: Tool Vault will support BOTH REST (for SPA) and MCP (for LLMs) endpoints, not MCP-only as originally planned. This is because the SPA already uses the REST API.

### 3. Python Script Integration (1 day remaining)

**✅ Completed** (PR #217):
- ✅ Migrated from websocket-client → requests library
- ✅ HTTP POST requests to localhost:60123
- ✅ All existing API methods preserved
- ✅ Optional filename parameter support

**🔄 Remaining**:
- [ ] Update to use POST /mcp endpoint (instead of POST /)
- [ ] Convert to JSON-RPC 2.0 request format
- [ ] Implement request ID management
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

**✅ Completed** (Foundation):
- ✅ HTTP transport layer established
- ✅ Health check endpoints operational
- ✅ Server lifecycle management working
- ✅ Python client HTTP connectivity tested

**🔄 Remaining** (MCP Protocol):
- [ ] Both servers expose `/mcp` endpoints responding to JSON-RPC 2.0
- [ ] GitHub Copilot can discover and call all tools
- [ ] Multi-step workflows execute successfully (e.g., get selection → delete → verify)
- [ ] Error responses use proper JSON-RPC error format
- [ ] Multiple LLM clients can connect simultaneously
- [ ] Python scripts (`debrief_api.py`) successfully use MCP endpoint
- [ ] ~~Tool Vault MCP-only implementation~~ → Changed to dual REST + MCP (SPA needs REST)

---

## Implementation Tasks (Detailed)

### Debrief State Server Implementation

#### Task 1.1: ~~Add Express HTTP Server~~ ✅ DONE (PR #217)

**Status**: ✅ Completed in PR #217

The HTTP server is already implemented in `apps/vs-code/src/services/debriefHttpServer.ts`:
- Express server on port 60123
- POST / endpoint for commands
- GET /health for monitoring
- 50MB JSON payload limit

**Skip this task** - move directly to adding /mcp endpoint.

#### Task 1.2: Implement MCP Endpoint 🔄 NEXT TASK

**Status**: 🔄 Not yet started - this is the next implementation task

Add this endpoint to `apps/vs-code/src/services/debriefHttpServer.ts`:

```typescript
// Add POST /mcp endpoint for MCP JSON-RPC 2.0 protocol
app.post('/mcp', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  // Validate JSON-RPC 2.0 format
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }
    });
  }

  try {
    switch (method) {
      case 'tools/list':
        // Return pre-generated tool index (see Task 1.3)
        res.json({
          jsonrpc: '2.0',
          id,
          result: { tools: mcpToolIndex.tools }
        });
        break;

      case 'tools/call':
        // Route to existing handleCommand function
        const result = await this.handleCommand({
          command: params.name,
          params: params.arguments
        });
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
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' }
    });
  }
});
```

**Note**: The existing `handleCommand` method already implements all needed command logic. We just need to wrap it in JSON-RPC format.

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
