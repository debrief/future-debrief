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
./toolvault.pyz serve --port 8000
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

### POST /tools/list

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

### Generate Index
```bash
python -m cli --tools-path tools generate --output index.json
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
curl -X POST http://localhost:8000/tools/list

# Call tool
curl -X POST http://localhost:8000/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"name": "word_count", "arguments": {"text": "test"}}'
```