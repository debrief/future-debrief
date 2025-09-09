# ToolVault Packager

A unified tool discovery and packaging system that creates self-contained deployable units with integrated Single Page Application (SPA) interface and MCP-compatible REST endpoints.

## Overview

ToolVault Packager discovers tools in designated directories, validates their type annotations, and packages them into unified deployables that serve both a web interface and MCP-compatible APIs from a single server instance.

## Integrated SPA Implementation

This implementation provides:
- **Unified Server**: Single server instance serving both SPA and MCP API
- **Tool Discovery System**: Automated tool validation and metadata extraction
- **MCP-Compatible REST Endpoints**: `/tools/list`, `/tools/call`, `/api/tools/`
- **Integrated Web Interface**: SPA accessible at `/ui/` endpoint with full tool interaction
- **Self-Contained .pyz Packaging**: Complete deployment in a single executable file
- **Auto-detecting API Configuration**: SPA automatically detects server URL/port
- **Development Override Support**: Backend URL override for development workflows
- **Build Process Integration**: Automated SPA building and asset bundling

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Discover Tools

```bash
python -m cli --tools-path tools list-tools
```

### 3. Start Unified Server

```bash
python -m cli --tools-path tools serve --port 8000
```

The server will start with both interfaces available:
```
Server starting on http://127.0.0.1:8000
Web interface: http://127.0.0.1:8000/ui/
MCP API: http://127.0.0.1:8000/tools/list
```

### 4. Build Complete Package (with SPA)

```bash
# Clean previous builds (optional)
npm run clean

# Build package with integrated SPA
npm run build
```

Or manually:
```bash
python packager.py tools --output toolvault.pyz
```

This will:
1. Build the SPA automatically
2. Package SPA assets into the .pyz file  
3. Create `tmp_package_contents/` for inspection and development
4. Create a unified deployable with both web UI and API

### 5. Run Packaged Version

```bash
# Start unified server from packaged version
python toolvault.pyz serve --port 8000
```

This provides the same unified interface:
- Web interface: `http://localhost:8000/ui/`
- MCP API: `http://localhost:8000/tools/list`

Additional CLI commands:
```bash
# List tools from packaged version
python toolvault.pyz list-tools

# Call a tool from packaged version  
python toolvault.pyz call-tool word_count '{"text": "Hello world"}'
```

**Note**: The .pyz package is fully self-contained with integrated SPA and doesn't require external dependencies.

### 6. Analyze Tool Details

```bash
# Show detailed tool information including source code and git history
python toolvault.pyz show-details
```

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

## Tool Requirements

Each tool must:
1. Be in its own Python file in the tools directory
2. Have exactly one public function
3. Include complete type annotations for all parameters and return value
4. Include a docstring describing the tool's purpose

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

# Access sample inputs
curl http://localhost:8000/api/tools/word_count/inputs/simple_text.json
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
    │   ├── inputs/             # Sample input files
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
        "path": "inputs/simple_text.json",
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

#### Sample Inputs (`inputs/*.json`)
Test cases and examples for each tool:

```json
{
  "text": "The quick brown fox jumps over the lazy dog"
}
```

### Integration Points

#### For Analysts
- **Tool Discovery**: Use global `index.json` for complete tool inventory
- **Source Analysis**: Access `metadata/source_code.html` for code review
- **Development History**: Review `metadata/git_history.json` for provenance
- **Test Data**: Examine `inputs/*.json` for usage patterns

#### For SPA Integration
- **Navigation**: Use tool-specific `tool.json` files as API endpoints via `tool_url` from global index
- **Content Display**: Load HTML source code directly into web interfaces
- **Data Fetching**: Use relative paths from tool.json files for dynamic loading
- **Statistics**: Access file counts and metrics from tool stats

#### For CLI Integration
- **Tool Execution**: `python toolvault.pyz call-tool <name> <args>`
- **Server Mode**: `python toolvault.pyz serve --port 8000`
- **Analysis**: `python toolvault.pyz show-details`

## CLI Commands

### Build Commands
```bash
# Clean build artifacts
npm run clean

# Build complete package with SPA
npm run build
```

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
├── README.md           # This file
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

## Future Phases

- **Phase 2**: Shared-types integration with schema-driven validation
- **Phase 3**: Provenance metadata and sample data bundling
- **Phase 4**: TypeScript runtime implementation
- **Phase 5**: Cross-runtime convergence and hardening

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

Tools can be tested individually:

```bash
python -c "
from tools.word_count import word_count
print(word_count('Hello world'))  # Should print: 2
"
```

Server can be tested with curl:

```bash
# List tools
curl -X GET http://localhost:8000/tools/list

# Call tool
curl -X POST http://localhost:8000/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"name": "word_count", "arguments": {"text": "test"}}'
```