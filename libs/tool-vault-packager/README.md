# ToolVault Packager

A multi-runtime tool discovery and packaging system that creates MCP-compatible deployable units for both Python and TypeScript environments.

## Overview

ToolVault Packager discovers tools in designated directories, validates their type annotations, and packages them into self-contained deployables with MCP-compatible REST endpoints.

## Phase 1 Implementation - Core Packager and Minimal Runtime

This phase provides:
- Tool discovery system with validation
- MCP-compatible REST endpoints (`/tools/list`, `/tools/call`)
- Python .pyz packaging
- CLI interface for tool management and server operations
- Input/output validation using Pydantic

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Discover Tools

```bash
python -m cli --tools-path tools list-tools
```

### 3. Start Server

```bash
python -m cli --tools-path tools serve --port 8000
```

### 4. Package into .pyz

```bash
python -m packager tools --output toolvault.pyz
```

### 5. Run Packaged Version

```bash
# List tools from packaged version
python toolvault.pyz list-tools

# Call a tool from packaged version  
python toolvault.pyz call-tool word_count '{"text": "Hello world"}'

# Start server from packaged version
python toolvault.pyz serve --port 8000
```

**Note**: The .pyz package is fully self-contained and doesn't require the external `tools` directory.

### 6. Analyze Tool Details

```bash
# Show detailed tool information including source code and git history
python toolvault.pyz show-details
```

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

## MCP Endpoints

### GET /tools/list

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

### POST /tools/call

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

## .PYZ Package Contents

The generated `.pyz` file contains a complete, self-contained ToolVault deployment with rich metadata for analysis and integration.

### Package Structure

```
toolvault.pyz (when extracted):
├── __main__.py              # Entry point for .pyz execution
├── cli.py                   # Command-line interface
├── discovery.py             # Tool discovery system
├── server.py                # FastAPI server
├── packager.py             # Packaging utilities
├── requirements.txt         # Dependencies documentation
├── index.json              # Global MCP-compatible tool schema
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
      "tool_url": "tools/word_count/tool.json"
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

### List Tools
```bash
python -m cli --tools-path tools list-tools
```

### Call Tool
```bash
python -m cli --tools-path tools call-tool word_count '{"text": "Hello world"}'
```

### Start Server
```bash
python -m cli --tools-path tools serve --port 8000 --host 0.0.0.0
```


## Architecture

### Core Modules

- **discovery.py**: Tool discovery and metadata extraction
- **server.py**: FastAPI server with MCP endpoints
- **cli.py**: Command-line interface
- **packager.py**: .pyz packaging system
- **validation.py**: Input/output validation

### Directory Structure

```
libs/tool-vault-packager/
├── __init__.py
├── discovery.py          # Tool discovery system
├── server.py             # FastAPI server
├── cli.py               # Command-line interface
├── packager.py          # Packaging system
├── validation.py        # Validation system
├── requirements.txt     # Dependencies
├── setup.py            # Package configuration
├── README.md           # This file
├── docs/               # Documentation
│   ├── toolvault_srd.md
│   └── toolvault_packager_plan.md
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