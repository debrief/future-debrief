# ADR 003: MCP-Only Tool Vault Server

**Status**: ✅ Accepted
**Date**: 2025-10-03
**Context**: [LLM Integration Architecture](../README.md)

## Context

The Tool Vault server (port 60124) exposes maritime analysis tools. Original plan included:
- POST `/mcp` endpoint for LLM integrations (new)
- GET `/tools/list` endpoint for tool discovery (legacy)
- POST `/tools/call` endpoint for tool execution (legacy)

This creates dual-API maintenance burden.

## Decision

Tool Vault will implement **MCP-only** - single POST `/mcp` endpoint with no legacy REST API.

## Rationale

### Pre-Production Advantage

1. **Not in Production Yet**
   - No existing clients to support
   - No backwards compatibility constraints
   - Can build it right from the start

2. **Clean Slate Implementation**
   - Single protocol to maintain
   - No legacy code paths
   - Simpler testing and debugging

3. **MCP is the Standard**
   - Modern, standardized protocol
   - Widely supported by LLM platforms
   - Future-proof design

### Technical Benefits

1. **Simpler Codebase**
   ```python
   # Before (dual API):
   @app.post("/mcp")           # New
   @app.get("/tools/list")     # Legacy
   @app.post("/tools/call")    # Legacy

   # After (MCP-only):
   @app.post("/mcp")           # Single endpoint!
   ```

2. **Consistent Protocol**
   - All clients use JSON-RPC 2.0
   - Standard error handling
   - Uniform authentication (if needed later)

3. **Reduced Testing Burden**
   - One API to test instead of two
   - Single set of integration tests
   - Faster development cycles

### Alignment with Architecture

Tool Vault's MCP endpoint serves multiple client types:
- ✅ GitHub Copilot (Phase 1)
- ✅ together.dev (Phase 2)
- ✅ Python scripts via `debrief_api.py` (see [ADR 004](004-python-scripts-via-mcp.md))
- ✅ Future LLM integrations

All use the same MCP protocol - no special cases!

## Implementation

### Tool Vault Server (Python/FastAPI)

```python
# libs/tool-vault-packager/server.py

from fastapi import FastAPI
from discovery import discover_tools

app = FastAPI()
tools_cache = discover_tools("./tools")  # Load once at startup

@app.post("/mcp")
async def mcp_endpoint(request: dict):
    """MCP JSON-RPC 2.0 endpoint - ONLY endpoint needed!"""
    try:
        method = request.get("method")
        request_id = request.get("id")

        if method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "tools": [
                        {
                            "name": tool["name"],
                            "description": tool["description"],
                            "inputSchema": tool["inputSchema"]
                        }
                        for tool in tools_cache
                    ]
                }
            }

        elif method == "tools/call":
            tool_name = request["params"]["name"]
            arguments = request["params"]["arguments"]
            result = await call_tool(tool_name, arguments)

            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }

        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }

    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request.get("id"),
            "error": {
                "code": -32603,
                "message": str(e)
            }
        }
```

**That's it!** No legacy endpoints cluttering the codebase.

### Client Usage

All clients use identical MCP protocol:

```python
# LLM extension or Python script
import requests

response = requests.post("http://localhost:60124/mcp", json={
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
})

tools = response.json()["result"]["tools"]
```

## Consequences

### Positive

- ✅ **Simpler implementation**: 50% less code vs dual-API
- ✅ **Faster development**: Single endpoint to implement and test
- ✅ **Cleaner architecture**: No legacy baggage
- ✅ **Easier maintenance**: One API surface to evolve
- ✅ **Future-proof**: Built on modern MCP standard

### Negative

- ⚠️ **All clients must use MCP**: No fallback to simple REST
- ⚠️ **Migration required if we add non-MCP clients later**: Unlikely scenario

### Neutral

- MCP already widely supported - not a burden
- JSON-RPC 2.0 is simple and well-documented

## Comparison with Debrief State Server

**Debrief State Server** (port 60123) maintains dual interface:
- POST `/mcp` for LLM extensions and Python scripts
- WebSocket for VS Code extension internal communication (legacy)

**Why the difference?**

| Aspect | Tool Vault :60124 | Debrief State :60123 |
|--------|-------------------|----------------------|
| **Existing clients** | None (pre-production) | VS Code extension uses WebSocket |
| **Internal comm** | No | Yes (extension ↔ editor) |
| **Decision** | MCP-only | Dual (MCP + WebSocket) |

## Migration Path (if needed)

If legacy REST API needed later:

```python
# Easy to add - just delegates to MCP handler
@app.get("/tools/list")
async def legacy_list_tools():
    # Call MCP endpoint internally
    mcp_request = {"method": "tools/list", "id": 1, "jsonrpc": "2.0"}
    mcp_response = await mcp_endpoint(mcp_request)
    return mcp_response["result"]
```

But we don't expect to need this - MCP covers all use cases.

## References

- [Tool Vault Server Spec](../specs/tool-vault-server.md)
- [ADR 001: Streamable-HTTP Transport](001-streamable-http-transport.md)
- [ADR 004: Python Scripts via MCP](004-python-scripts-via-mcp.md)
- [Phase 1 Implementation](../phases/phase-1-implementation.md)

## Alternatives Considered

### Dual API (MCP + Legacy REST)

**Rejected**: Adds complexity for no benefit (no existing clients)

### HTTP Refactoring to Modern REST

**Rejected**: MCP is already a standardized REST-based protocol - no need to reinvent

### GraphQL

**Rejected**: Overkill for simple tool execution use case

---

**Back to**: [Main Architecture](../README.md) | [All Decisions](../README.md#key-decisions)
