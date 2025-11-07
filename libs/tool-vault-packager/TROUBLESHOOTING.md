# Tool Vault Server Troubleshooting

## Problem: Getting connection errors or server not responding

### Symptoms
- Cannot connect to MCP endpoint
- Server not starting
- Wrong server running on port

### Cause
You're hitting the **wrong server**. Either:
1. Running the old `server.py` instead of `server_fastmcp.py`
2. Another process is using port 8000
3. You started a different server command

### Solution

**Step 1: Stop ALL servers**

On your Mac, run:
```bash
# Find what's using port 8000
lsof -i :8000

# Kill any Python servers
pkill -f "python.*cli.py"
pkill -f "python.*server"
pkill -f uvicorn

# Or kill specific process (use PID from lsof)
kill <PID>
```

**Step 2: Start the CORRECT server**

```bash
cd libs/tool-vault-packager

# This is the correct command (pure FastMCP):
python cli.py serve-fastmcp --port 8000
```

You should see this output:
```
======================================================================
 ToolVault FastMCP Server (Trial Implementation)
======================================================================

Discovering tools...
Discovered 9 tools
Registering tools with FastMCP...
  ✓ Registered: select_all_visible
  ✓ Registered: select_feature_start_time
  ...

Server starting on http://127.0.0.1:8000

Pure FastMCP Protocol Server:
  - MCP Endpoint:  http://127.0.0.1:8000/mcp (SSE transport)

This is a PURE FastMCP implementation - no REST endpoints.
Use MCP clients (like Claude Desktop, MCP Inspector) to interact with tools.
```

**Step 3: Verify it's working**

The pure FastMCP server only provides the MCP protocol endpoint. You need an MCP client to interact with it:

1. **MCP Inspector** (recommended for testing):
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:8000/mcp
   ```

2. **Claude Desktop**: Configure in your Claude Desktop MCP settings

3. **Manual SSE test** (low-level):
   ```bash
   # This will show SSE stream from MCP endpoint
   curl -N http://localhost:8000/mcp
   ```

---

## Quick Test (One Terminal)

If you want to test without two terminals:

```bash
cd libs/tool-vault-packager

# Start server in background
python cli.py serve-fastmcp --port 8000 &

# Wait for it to start
sleep 5

# Test with MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:8000/mcp

# Stop server when done
pkill -f "cli.py serve-fastmcp"
```

---

## Verify You're Using the Right Command

❌ **WRONG**:
- `python server.py` (old implementation)
- `python cli.py serve` (old REST API server)
- `python cli.py serve-hybrid` (hybrid server with REST endpoints)
- `python cli.py serve-dev` (dev mode)

✅ **CORRECT for this trial branch**:
- `python cli.py serve-fastmcp --port 8000`

---

## About Pure FastMCP

This trial branch uses **pure FastMCP** which means:

✅ **What it provides**:
- Standard MCP protocol endpoint at `/mcp`
- SSE (Server-Sent Events) transport
- Full MCP tool discovery and execution
- Compatible with all MCP clients

❌ **What it does NOT provide**:
- REST endpoints like `/tools/list` or `/tools/call`
- Direct HTTP tool execution
- Health check JSON endpoints

**Why pure FastMCP?**
This is a trial to evaluate the FastMCP framework for simplifying the codebase by removing custom REST API implementations and relying entirely on the MCP protocol standard.

---

## MCP Inspector Setup

To test tools with MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Start your server
python cli.py serve-fastmcp --port 8000

# In another terminal, connect Inspector
npx @modelcontextprotocol/inspector http://localhost:8000/mcp
```

The Inspector will open a web UI where you can:
- View all available tools
- Test tool execution with parameters
- See tool schemas and documentation
