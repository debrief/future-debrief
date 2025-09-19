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

## Tool Testing Framework

ToolVault includes an automated testing framework that validates tools during packaging to catch issues before deployment.

### Generate Test Baselines (Local Development)

**Note**: Baseline generation is only done during local development. CI expects baselines to already exist in the repository.

```bash
# Generate baselines for all tools (LOCAL DEVELOPMENT ONLY)
python -m testing.cli generate-baseline

# Generate baseline for a specific tool (LOCAL DEVELOPMENT ONLY)
python -m testing.cli generate-baseline word_count
```

### Run Tool Tests

```bash
# Run all tool tests
python -m testing.cli test

# Run tests with detailed report
python -m testing.cli test --save-report test_report.json

# List discovered tools
python -m testing.cli list-tools
```

### Test Mode in Web Interface

The web interface includes a test mode that compares tool outputs against expected baselines:

1. Open the web interface: `http://localhost:8000/ui/`
2. Select a tool with test data
3. Enable "Test Mode" to see pass/fail results
4. Use "Run All Tests" to validate all samples at once

This testing framework ensures tool reliability and catches regressions during development.

## Developer Documentation

For detailed information about:
- Tool development and requirements
- SPA development
- Docker deployment
- Architecture details
- API documentation
- Packaging internals

See [DEVELOPERS.md](DEVELOPERS.md)