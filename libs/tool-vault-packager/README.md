# ToolVault

ToolVault packages tools into self-contained `.pyz` files that include both a web interface and MCP-compatible REST endpoints. Each `.pyz` file contains everything needed to run your tools - no external dependencies required.

**Developer?** See [DEVELOPERS.md](DEVELOPERS.md) for tool development, Docker deployment, SPA development, architecture details, and API documentation.

## Using a toolvault.pyz File

Once you have a `toolvault.pyz` file, you can use it anywhere Python is available:

### Start the Server

```bash
python toolvault.pyz serve --port 8000
```

This provides:
- Web interface: `http://localhost:8000/ui/`
- MCP API: `http://localhost:8000/tools/list`

### List Available Tools

```bash
python toolvault.pyz list-tools
```

### Call a Tool Directly

```bash
python toolvault.pyz call-tool <tool_name> '<json_arguments>'
```

Example:
```bash
python toolvault.pyz call-tool word_count '{"text": "Hello world"}'
```

### Show Tool Details

```bash
python toolvault.pyz show-details
```

### Test with HTTP Requests

```bash
# List tools
curl -X GET http://localhost:8000/tools/list

# Call tool
curl -X POST http://localhost:8000/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"name": "word_count", "arguments": {"text": "test"}}'
```

## Developer Documentation

For detailed information about:
- Tool development and requirements
- SPA development
- Docker deployment
- Architecture details
- API documentation
- Packaging internals

See [DEVELOPERS.md](DEVELOPERS.md)