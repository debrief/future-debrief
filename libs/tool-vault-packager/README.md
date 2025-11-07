# ToolVault

ToolVault packages tools into self-contained `.pyz` files that provide MCP (Model Context Protocol) servers. Each `.pyz` file contains everything needed to run your tools - no external dependencies required.

**Note**: This trial branch uses **pure FastMCP** - providing only the standard MCP protocol endpoint. No REST API or web UI in this version.

**Developer?** See [DEVELOPERS.md](DEVELOPERS.md) for tool development, Docker deployment, SPA development, architecture details, and API documentation.

## Using a toolvault.pyz File

Once you have a `toolvault.pyz` file, you can use it anywhere Python is available:

### Start the Server

```bash
python toolvault.pyz serve-fastmcp --port 8000
```

This provides:
- MCP Protocol Endpoint: `http://localhost:8000/mcp` (SSE transport)

**To interact with the server**, use an MCP client:
- MCP Inspector: `npx @modelcontextprotocol/inspector http://localhost:8000/mcp`
- Claude Desktop: Configure in MCP settings
- Any MCP-compatible client

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

### Test with MCP Inspector

```bash
# Start the server
python toolvault.pyz serve-fastmcp --port 8000 &

# Connect MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:8000/mcp
```

The Inspector provides a web UI to:
- View all available tools
- Test tool execution with parameters
- See tool schemas and documentation

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

## Python Static Analysis

ToolVault includes comprehensive static analysis tools to prevent runtime errors and improve code quality. The tools are configured to run in gradual cleanup mode (non-blocking) to support incremental code improvement.

### Available Tools

- **ruff**: Fast Python linter with auto-fixing and formatting
- **mypy**: Static type checking to catch type-related errors

### Development Commands

```bash
# Install development dependencies (includes static analysis tools)
make install-dev-deps

# Run linting (non-blocking - shows issues but doesn't fail)
make lint

# Run linting with auto-fix and formatting
make lint-fix

# Run type checking (non-blocking - shows issues but doesn't fail)
make type-check

# Run all static analysis checks
make check-all
```

### NPM Scripts

```bash
# Alternative npm commands that call Makefile targets
npm run install:dev-deps
npm run lint
npm run lint:fix
npm run typecheck
npm run check:all
```

### Integration Points

- **Pre-push hooks**: Static analysis runs automatically before push (non-blocking warnings)
- **CI pipeline**: GitHub Actions runs static analysis on Python file changes
- **Local development**: Run checks manually or integrate into your editor

### Error Prevention

These tools help prevent runtime errors like:
- `AttributeError: 'ToolVaultServer' object has no attribute 'tools_path'`
- JSON serialization issues with Pydantic models
- Missing type hints and import issues
- Code style inconsistencies

### Gradual Improvement Strategy

The static analysis is configured for gradual cleanup:
- Issues are reported as warnings, not build failures
- Developers can fix issues incrementally over time
- New code should aim to pass all checks
- Gradually tighten strictness as codebase improves

## Developer Documentation

For detailed information about:
- Tool development and requirements
- SPA development
- Docker deployment
- Architecture details
- API documentation
- Packaging internals

See [DEVELOPERS.md](DEVELOPERS.md)