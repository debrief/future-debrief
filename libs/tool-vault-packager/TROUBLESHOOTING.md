# Tool Vault Server Troubleshooting

## Problem: Getting "Cannot GET /tools/list" or health returns "OK" instead of JSON

### Symptoms
- Health endpoint returns plain text `"OK"` instead of JSON
- Tool list returns HTML error `"Cannot GET /tools/list"`
- Tool execution returns `"Cannot POST /tools/call"`

### Cause
You're hitting the **wrong server**. Either:
1. Running the old `server.py` instead of `server_fastmcp_simple.py`
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

# This is the correct command:
python cli.py serve-hybrid --port 8000
```

You should see this output:
```
======================================================================
ToolVault Simple FastMCP Server
======================================================================

Discovering tools...
Discovered 9 tools
Registering tools with FastMCP...
  ✓ Registered: select_all_visible
  ✓ Registered: select_feature_start_time
  ...

Server starting on http://127.0.0.1:8000

Endpoints:
  - MCP Protocol:  POST http://127.0.0.1:8000/mcp
  - Health Check:  GET  http://127.0.0.1:8000/health
  - List Tools:    GET  http://127.0.0.1:8000/tools/list
  - Execute Tool:  POST http://127.0.0.1:8000/tools/call
```

**Step 3: Verify it's working**

In a NEW terminal:
```bash
# Health should return JSON
curl http://localhost:8000/health
# Expected: {"status":"healthy","tools":9,"mcp_enabled":true}

# Should NOT return: "OK"
```

**Step 4: Run test script**

```bash
cd libs/tool-vault-packager
./test-tools.sh
```

---

## Problem: test-tools.sh shows jq parse errors

### Cause
Server isn't running

### Solution
See Step 2 above - start the server first, THEN run the test script in a different terminal.

---

## Quick Test (One Terminal)

If you want to test without two terminals:

```bash
cd libs/tool-vault-packager

# Start server in background
python cli.py serve-hybrid --port 8000 &

# Wait for it to start
sleep 5

# Test it
curl http://localhost:8000/health

# Run full tests
./test-tools.sh

# Stop server when done
pkill -f "cli.py serve-hybrid"
```

---

## Verify You're Using the Right Command

❌ **WRONG**:
- `python server.py` (old implementation)
- `python cli.py serve` (different server)
- `python cli.py serve-dev` (dev mode with Inspector issues)

✅ **CORRECT**:
- `python cli.py serve-hybrid --port 8000`

---

## Expected vs Actual Responses

### Health Endpoint

✅ **CORRECT** (serve-hybrid):
```json
{"status":"healthy","tools":9,"mcp_enabled":true}
```

❌ **WRONG** (old server):
```
OK
```

### Tool List Endpoint

✅ **CORRECT** (serve-hybrid):
```json
{"root":[{"type":"category","name":"feature-management","children":[...]}, ...]}
```

❌ **WRONG** (old server):
```html
<!DOCTYPE html>
<html lang="en">
<head><title>Error</title></head>
<body><pre>Cannot GET /tools/list</pre></body>
</html>
```
