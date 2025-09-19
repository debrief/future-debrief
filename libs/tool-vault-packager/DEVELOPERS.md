# ToolVault Packager - Developer Guide

This guide covers the technical details for developing tools, customizing the SPA, and understanding the ToolVault architecture.

## Tool Development

### Tool Requirements

Each tool must:
1. Be in its own Python file in the tools directory
2. Have exactly one public function
3. Include complete type annotations for all parameters and return value
4. Include a docstring describing the tool's purpose. The first sentence of the docstring is used as a short description for that tool.
5. Tool folders can contain optional `samples` folder, containing sample data files with both input and expected output for testing and exploration.

### Example Tool

```python
"""Word counting tool for text analysis."""

def word_count(text: str) -> int:
    """
    Count the number of words in a given block of text.
    
    Args:
        text: The input text block to count words from
        
    Returns:
        The number of words found in the text
    """
    if not text or not text.strip():
        return 0
    return len(text.strip().split())
```

## Docker Development

### Local Development Build
The Docker build process now uses the automated build system that handles shared-types dependencies automatically.

```bash
# 1. Build the shared-types package (only needed when schemas change)
pnpm --filter @debrief/shared-types build

# 2. Build and run the container (uses npm run build:spa internally)
docker build -t toolvault .
docker run -p 5000:5000 toolvault
```

**Note**: The Dockerfile now uses `npm run build:spa` which automatically:
- Creates context-appropriate symlinks to shared-types
- Handles workspace→file dependency conversion
- Manages temporary package.json modifications

For manual shared-types staging (legacy approach):
```bash
# Manual staging (only if needed for debugging)
mkdir -p shared-types
cp -r ../shared-types/{package.json,dist,src,derived} shared-types/
```

### CI/Production Build (Optimized)
```bash
# First create the .pyz artifact
npm run build

# Build Docker image (uses pre-built .pyz)
docker build -t toolvault .

# Run container
docker run -p 5000:5000 toolvault
```

The Dockerfile automatically detects:
- **CI Mode**: If `toolvault.pyz` exists, uses the pre-built artifact
- **Local Mode**: If no `.pyz` file, builds from source

The container runs on port 5000 with:
- Web interface: `http://localhost:5000/ui/`
- MCP API: `http://localhost:5000/tools/list`
- Health check: `http://localhost:5000/health`

## SPA Development

### Development Setup

For SPA development with live reloading:

```bash
# Navigate to SPA directory
cd spa

# Install dependencies
npm install

# Start development server (connects to backend on localhost:8000)
npm run dev

# Or override backend URL for custom backend
npm run dev:with-backend
```

### Backend URL Override

The SPA automatically detects the server URL when served from the integrated server. For development with a custom backend:

```bash
# Example: Connect to backend on different port
npm run dev:with-backend
```

This uses the configured backend URL override: `http://localhost:8001`

### Build Process

The SPA is automatically built during package creation, but you can build it separately:

```bash
cd spa
npm run build
```

Built assets are placed in `spa/dist/` and automatically included in the .pyz package.

### Package Inspection

After building, inspect the complete package contents before compression:

```bash
ls -la tmp_package_contents/
```

This persistent folder contains the exact structure that gets packaged into the .pyz file, including SPA assets, tool metadata, and all supporting files.

## REST API Endpoints

The server provides both virtual and direct file access endpoints:

### Virtual Endpoints (Generated Content)

#### GET /tools/list

Returns available tools with their schemas:

```json
{
  "tools": [
    {
      "name": "word_count",
      "description": "Count the number of words in a given block of text.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "Parameter text"
          }
        },
        "required": ["text"],
        "additionalProperties": false
      }
    }
  ],
  "version": "1.0.0",
  "description": "ToolVault packaged tools"
}
```

#### POST /tools/call

Execute a tool with arguments:

```bash
curl -X POST http://localhost:8000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "word_count", "arguments": {"text": "Hello world"}}'
```

Response:
```json
{
  "result": 2,
  "isError": false
}
```

### Direct File Access Endpoints

#### GET /api/tools/{path}

Direct access to tool files and metadata. Used by SPAs and analysis tools for navigation:

```bash
# Access tool metadata
curl http://localhost:8000/api/tools/word_count/tool.json

# Access source code HTML
curl http://localhost:8000/api/tools/word_count/metadata/source_code.html

# Access git history
curl http://localhost:8000/api/tools/word_count/metadata/git_history.json

# Access sample data
curl http://localhost:8000/api/tools/word_count/samples/simple_text.json
```

**Navigation Flow:**
1. Start at `/tools/list` to get tool URLs pointing to `/api/tools/{tool}/tool.json`
2. Follow `tool_url` to get tool structure and file paths
3. Navigate to specific files using paths from tool.json

## .PYZ Package Contents

The generated `.pyz` file contains a complete, self-contained ToolVault deployment with rich metadata for analysis and integration.

### Package Structure

```
toolvault.pyz (when extracted):
├── __main__.py              # Entry point for .pyz execution
├── cli.py                   # Command-line interface
├── discovery.py             # Tool discovery system
├── server.py                # FastAPI server with SPA integration
├── packager.py             # Packaging utilities
├── requirements.txt         # Dependencies documentation
├── index.json              # Global MCP-compatible tool schema
├── static/                 # Integrated SPA assets
│   ├── index.html             # SPA entry point
│   ├── assets/                # Built CSS/JS files
│   │   ├── index-[hash].css
│   │   └── index-[hash].js
│   └── vite.svg              # SPA assets
└── tools/                  # Packaged tools with metadata
    ├── word_count/
    │   ├── execute.py          # Tool implementation
    │   ├── tool.json           # Tool-specific navigation index
    │   ├── samples/            # Sample data files with input/output
    │   │   ├── empty_text.json
    │   │   ├── simple_text.json
    │   │   └── paragraph_text.json
    │   └── metadata/           # Rich supporting data
    │       ├── git_history.json    # Git commit history
    │       └── source_code.html    # HTML-formatted source code
    └── toggle_first_feature_color/
        └── [same structure]
```

### Global Index (`index.json`)

The root `index.json` provides MCP-compatible tool schemas:

```json
{
  "tools": [
    {
      "name": "word_count",
      "description": "Count the number of words...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {"type": "string", "description": "Parameter text"}
        },
        "required": ["text"],
        "additionalProperties": false
      },
      "outputSchema": {"type": "integer"},
      "tool_url": "/api/tools/word_count/tool.json"
    }
  ],
  "version": "1.0.0",
  "description": "ToolVault packaged tools"
}
```

### Tool-Specific Index (`tools/{tool}/tool.json`)

Each tool directory contains a navigation index for SPA/analysis integration:

```json
{
  "tool_name": "word_count",
  "description": "Count the number of words in a given block of text...",
  "files": {
    "execute": {
      "path": "execute.py",
      "description": "Main tool implementation",
      "type": "python"
    },
    "source_code": {
      "path": "metadata/source_code.html",
      "description": "Pretty-printed source code",
      "type": "html"
    },
    "git_history": {
      "path": "metadata/git_history.json",
      "description": "Git commit history",
      "type": "json"
    },
    "inputs": [
      {
        "name": "simple_text",
        "path": "samples/simple_text.json",
        "description": "Sample input: simple_text",
        "type": "json"
      }
    ]
  },
  "stats": {
    "sample_inputs_count": 3,
    "git_commits_count": 2,
    "source_code_length": 691
  }
}
```

### Supporting Metadata

#### Git History (`metadata/git_history.json`)
Complete commit history for tool development context:

```json
[
  {
    "hash": "f74ff4fa04058aa27ba0dbe0da9037acec7e7f15",
    "author": {
      "name": "Ian Mayo",
      "email": "ian@planetmayo.com"
    },
    "date": "2025-09-08 12:37:51 +0100",
    "message": "feat: Implement ToolVault Multi-Runtime Packager Phase 0 & 1"
  }
]
```

#### HTML Source Code (`metadata/source_code.html`)
Styled, browser-ready source code display:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>word_count - Source Code</title>
    <style>/* Professional code styling */</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="tool-name">word_count</div>
        </div>
        <div class="source-code">def word_count(text: str) -> int:
    """Count the number of words in a given block of text."""
    # Implementation...</div>
    </div>
</body>
</html>
```

#### Sample Data (`samples/*.json`)
Test cases and examples for each tool with unified input/output format:

```json
{
  "input": {
    "text": "The quick brown fox jumps over the lazy dog"
  },
  "expectedOutput": {
    "command": "showText",
    "payload": "Word count: 9"
  }
}
```

### Integration Points

#### For Analysts
- **Tool Discovery**: Use global `index.json` for complete tool inventory
- **Source Analysis**: Access `metadata/source_code.html` for code review
- **Development History**: Review `metadata/git_history.json` for provenance
- **Test Data**: Examine `samples/*.json` for usage patterns and expected outputs

#### For SPA Integration
- **Navigation**: Use tool-specific `tool.json` files as API endpoints via `tool_url` from global index
- **Content Display**: Load HTML source code directly into web interfaces
- **Data Fetching**: Use relative paths from tool.json files for dynamic loading
- **Statistics**: Access file counts and metrics from tool stats

#### For CLI Integration
- **Tool Execution**: `python toolvault.pyz call-tool <name> <args>`
- **Server Mode**: `python toolvault.pyz serve --port 8000`
- **Analysis**: `python toolvault.pyz show-details`

## Architecture

### Core Modules

- **discovery.py**: Tool discovery and metadata extraction
- **server.py**: FastAPI server with MCP endpoints and SPA integration
- **cli.py**: Command-line interface
- **packager.py**: .pyz packaging system with SPA build integration
- **validation.py**: Input/output validation
- **spa/**: Integrated Single Page Application

### Directory Structure

```
libs/tool-vault-packager/
├── __init__.py
├── discovery.py          # Tool discovery system
├── server.py             # FastAPI server with SPA integration
├── cli.py               # Command-line interface
├── packager.py          # Packaging system with SPA build
├── validation.py        # Validation system
├── package.json         # Build system configuration
├── requirements.txt     # Python dependencies
├── setup.py            # Package configuration
├── README.md           # User documentation
├── DEVELOPERS.md       # This file
├── docs/               # Documentation
│   ├── toolvault_srd.md
│   └── toolvault_packager_plan.md
├── spa/                # Integrated Single Page Application
│   ├── src/               # SPA source code
│   ├── public/            # Static assets
│   ├── dist/              # Built SPA assets (after build)
│   ├── package.json       # SPA dependencies
│   ├── vite.config.ts     # Build configuration
│   └── README.md          # SPA documentation
└── tools/              # Example tools
    ├── __init__.py
    ├── word_count.py
    └── toggle_first_feature_color.py
```

## Error Handling

The system provides comprehensive error handling:

- **Tool Discovery Errors**: Missing type annotations, multiple public functions
- **Validation Errors**: Invalid input arguments, schema violations
- **Execution Errors**: Tool runtime failures with stack traces
- **Packaging Errors**: Missing dependencies, invalid tool structures

## CLI Development Commands

### List Tools
```bash
python -m cli --tools-path tools list-tools
```

### Call Tool
```bash
python -m cli --tools-path tools call-tool word_count '{"text": "Hello world"}'
```

### Start Unified Server
```bash
python -m cli --tools-path tools serve --port 8000 --host 0.0.0.0
```

Server provides both interfaces:
- **Web Interface**: `http://localhost:8000/ui/`
- **MCP API**: `http://localhost:8000/tools/list`

### SPA Development Commands
```bash
# Navigate to SPA directory
cd spa

# Start development server
npm run dev

# Start with backend URL override
npm run dev:with-backend
```

## Performance Requirements

- Startup: <2 seconds
- Tool discovery: <200ms
- Fully offline operation supported
- MCP protocol compliance

## Dependencies

- FastAPI: Web framework for REST endpoints
- Uvicorn: ASGI server for FastAPI
- Pydantic: Data validation and settings management
- Python 3.9+: Minimum Python version

## Testing

### Automated Testing Framework

ToolVault includes a comprehensive testing framework that validates tools during packaging to catch issues before deployment.

#### Framework Components

1. **Tool Tester** (`testing/tool_tester.py`): Core testing logic for individual tools
2. **Baseline Generator** (`testing/tool_tester.py`): Generates expected outputs from existing input data
3. **Test Runner** (`testing/test_runner.py`): Orchestrates testing across all tools
4. **CLI Interface** (`testing/cli.py`): Command-line interface for testing operations

#### Testing Workflow

The testing framework follows a "report and continue" strategy:
- Tests all tools, logging failures but continuing to completion
- Fails packaging only if any tool tests fail (configurable)
- Generates detailed reports with diff information for failures

#### Baseline Generation (Local Development Only)

**IMPORTANT**: Baseline generation is a local development task only. CI systems expect existing baselines to be committed to the repository.

Generate expected outputs for all tools:

```bash
# Generate baselines for all tools (LOCAL DEVELOPMENT ONLY)
python -m testing.cli generate-baseline

# Generate baseline for specific tool (LOCAL DEVELOPMENT ONLY)
python -m testing.cli generate-baseline word_count

# Use npm scripts (LOCAL DEVELOPMENT ONLY)
npm run test:tools:baseline
```

This creates unified `sample.json` files in the `samples/` directory with the format:

```json
{
  "sample_name": {
    "input": { "text": "Hello world" },
    "expectedOutput": { "command": "showText", "payload": "Word count: 2" }
  }
}
```

#### Running Tests

Execute regression tests:

```bash
# Run all tool tests
python -m testing.cli test

# Run tests with detailed report
python -m testing.cli test --save-report test_report.json

# List discovered tools
python -m testing.cli list-tools

# Use npm scripts
npm run test:tools
npm run test:tools:report
```

#### Packaging Integration

Testing is automatically integrated into the packaging process:

```python
# In packager.py - testing runs before .pyz creation
success = test_runner.run_all_tool_tests()
if not success:
    raise PackagerError("Tool tests failed. Packaging aborted.")
```

Disable testing during packaging:

```python
package_toolvault(tools_path, run_tests=False)
```

#### SPA Test Mode

The web interface includes interactive test mode:

1. **Test Toggle**: Enable "Test Mode" to compare outputs with baselines
2. **Run All Tests**: Execute all samples and show pass/fail status
3. **Visual Diff**: See expected vs actual outputs for failing tests
4. **Real-time Testing**: Test individual inputs against expected outputs

#### CI Integration

GitHub Actions automatically run tool tests against committed baselines:

```yaml
# CI/action/test-pyz/action.yml includes:
- name: Run tool regression tests  # Uses existing baselines from repo
```

**Note**: CI does not generate baselines - it only runs tests against existing baselines that should be committed to the repository during development.

### Unit Testing
Tools can be tested individually:

```bash
python -c "
from tools.word_count import word_count
print(word_count('Hello world'))  # Should print: 2
"
```

### Integration Testing
Server can be tested with curl:

```bash
# List tools
curl -X GET http://localhost:8000/tools/list

# Call tool
curl -X POST http://localhost:8000/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"name": "word_count", "arguments": {"text": "test"}}'
```

### Testing Best Practices

1. **Generate baselines early**: Create baselines when tools work correctly (local development only)
2. **Commit baselines to repo**: Generated baselines must be committed for CI to use
3. **Review test failures**: Failed tests indicate real issues or intentional changes
4. **Update baselines carefully**: Only regenerate when behavior changes are intentional
5. **Use test mode in SPA**: Interactive testing during development
6. **Monitor CI results**: Automated testing catches regressions

### Development Workflow

1. **Tool Development**: Create or modify tools in `tools/` directory
2. **Generate Baselines**: Run `python -m testing.cli generate-baseline` locally
3. **Verify Tests**: Run `python -m testing.cli test` to ensure all pass
4. **Commit Changes**: Commit both tool changes and updated baseline files
5. **CI Validation**: CI runs tests against committed baselines automatically

## Future Development Phases

- **Phase 2**: Shared-types integration with schema-driven validation
- **Phase 3**: Provenance metadata and sample data bundling
- **Phase 4**: TypeScript runtime implementation
- **Phase 5**: Cross-runtime convergence and hardening