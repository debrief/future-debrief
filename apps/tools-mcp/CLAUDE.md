# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Tools MCP package.

## Overview

Tools MCP is a pure FastMCP server implementation that exposes maritime analysis tools via the Model Context Protocol (MCP). It provides a clean, modern alternative to the legacy REST-based tool serving strategy.

## Quick Start

### Development Commands

```bash
# Install in development mode
pip install -e .

# Run the server
python -m tools_mcp

# Test the server
python test_server.py

# Build distribution
make build
```

### Package Structure

```
src/tools_mcp/
├── __init__.py           # Package initialization
├── __main__.py          # CLI entry point
├── server.py            # FastMCP server with tool discovery
└── tools/               # Maritime analysis tools (copied from tool-vault-packager)
    ├── feature-management/
    ├── selection/
    ├── text/
    ├── track-analysis/
    └── viewport/
```

## Architecture

### FastMCP Server (server.py)

The core server implementation:

1. **Tool Discovery**: Automatically discovers tools in the `tools/` directory
2. **Dynamic Registration**: Registers each tool as a FastMCP tool with proper schemas
3. **Type Conversion**: Converts DebriefCommand responses to dictionaries for MCP transport
4. **Error Handling**: Catches tool execution errors and returns them as ShowTextCommand

Key functions:
- `discover_tools()`: Scans tools directory and imports tool modules
- `register_tool()`: Wraps tool functions for FastMCP compatibility
- `initialize_server()`: Sets up the FastMCP instance with all tools

### Tool Structure

Each tool follows this pattern:

```python
from pydantic import BaseModel, Field
from debrief.types.tools import DebriefCommand, ShowTextCommand

class ToolParameters(BaseModel):
    """Pydantic model for tool parameters."""
    param1: str = Field(description="Parameter description")

def tool_function(params: ToolParameters) -> DebriefCommand:
    """
    Tool description (used in MCP schema).

    Args:
        params: Tool parameters

    Returns:
        DebriefCommand with the result
    """
    # Tool implementation
    return ShowTextCommand(payload="Result")
```

### Tool Discovery Rules

For a tool to be discovered:

1. Must be in `tools/{category}/{tool_name}/execute.py`
2. Must have exactly one public function (not starting with `_`)
3. Function must have a `params` parameter with a Pydantic BaseModel type hint
4. Function must return a DebriefCommand

## Development Workflow

### Adding New Tools

1. Create directory: `src/tools_mcp/tools/{category}/{tool_name}/`
2. Create `execute.py` with the tool implementation
3. Define a Pydantic parameters model
4. Implement the tool function
5. Test with `python test_server.py`
6. The tool will be automatically discovered on server startup

### Modifying Existing Tools

1. Tools are located in `src/tools_mcp/tools/`
2. Each tool has its own directory with `execute.py`
3. Edit the execute.py file
4. Restart the server to see changes
5. Use test_server.py to verify

### Testing Tools

```python
# test_server.py demonstrates how to test tools
from tools_mcp.server import mcp
from tools_mcp.tools.text.word_count.execute import WordCountParameters

# Get the tool
tool = mcp._tool_manager._tools["text_word_count"]

# Create test parameters
params = WordCountParameters(text="Hello world")

# Call the tool
result = tool.fn(params)
print(result)  # {'command': 'showText', 'payload': 'Word count: 2'}
```

## Dependencies

### Shared Types

Tools depend on `debrief-types` from `libs/shared-types`:

- **DebriefCommand**: Base class for all command responses
- **Command Types**: ShowTextCommand, SetSelectionCommand, etc.
- **Feature Types**: DebriefFeature, DebriefFeatureCollection, etc.
- **State Types**: SelectionState, ViewportState, TimeState

To update shared types:
```bash
# Rebuild shared-types
cd ../../libs/shared-types
pnpm build

# Reinstall in tools-mcp
cd ../../apps/tools-mcp
pip install -e ../../libs/shared-types --force-reinstall
```

### FastMCP

The server uses FastMCP for MCP protocol implementation:

- Automatic schema generation from Pydantic models
- Tool registration with @mcp.tool decorator
- Built-in transport handling (stdio, HTTP, SSE)

## Build System

### Building the Package

```bash
# Build Python wheel
python -m build

# Output: dist/tools_mcp-1.0.0-py3-none-any.whl
```

### Build Artifacts

- **Wheel**: `dist/tools_mcp-1.0.0-py3-none-any.whl` - Standard Python package
- **.pyz zipapp**: Not recommended due to binary dependency issues

### Installation

```bash
# Development mode (editable)
pip install -e .

# From wheel
pip install dist/tools_mcp-1.0.0-py3-none-any.whl
```

## Tool Command Reference

### Display Commands

- **ShowTextCommand**: Display text message
  ```python
  ShowTextCommand(payload="Message text")
  ```

- **ShowDataCommand**: Display structured data
  ```python
  ShowDataCommand(payload={"key": "value"})
  ```

- **ShowImageCommand**: Display an image
  ```python
  ShowImageCommand(payload=ShowImagePayload(...))
  ```

### State Management Commands

- **SetSelectionCommand**: Update feature selection
  ```python
  SetSelectionCommand(payload=SelectionState(selectedIds=["id1", "id2"]))
  ```

- **SetViewportCommand**: Update map viewport
  ```python
  SetViewportCommand(payload=ViewportState(bounds=[west, south, east, north]))
  ```

- **SetTimeStateCommand**: Update time state
  ```python
  SetTimeStateCommand(payload=TimeState(currentTime=datetime.now()))
  ```

### Feature Management Commands

- **AddFeaturesCommand**: Add new features
  ```python
  AddFeaturesCommand(payload=[feature1, feature2])
  ```

- **UpdateFeaturesCommand**: Update existing features
  ```python
  UpdateFeaturesCommand(payload=[updated_feature1])
  ```

- **DeleteFeaturesCommand**: Delete features
  ```python
  DeleteFeaturesCommand(payload=["feature_id_1", "feature_id_2"])
  ```

- **SetFeatureCollectionCommand**: Replace entire collection
  ```python
  SetFeatureCollectionCommand(payload=DebriefFeatureCollection(...))
  ```

## Troubleshooting

### Tool Not Discovered

Check:
1. Directory structure: `tools/{category}/{tool_name}/execute.py`
2. Exactly one public function in execute.py
3. Function has proper type hints: `def func(params: Model) -> DebriefCommand`
4. Check server startup logs for discovery messages

### Import Errors

```bash
# Missing debrief.types
pip install -e ../../libs/shared-types

# Missing fastmcp
pip install fastmcp>=0.5.0
```

### Type Errors

Ensure:
1. All tool parameters use Pydantic BaseModel
2. Function returns a DebriefCommand subclass
3. Type hints are complete and accurate

### Runtime Errors

Tools should handle errors gracefully:
```python
try:
    # Tool logic
    result = process_data()
    return ShowTextCommand(payload=result)
except Exception as e:
    return ShowTextCommand(payload=f"Error: {str(e)}")
```

## Common Patterns

### Validation Pattern

```python
from pydantic import BaseModel, Field, field_validator

class Params(BaseModel):
    value: int = Field(gt=0, description="Must be positive")

    @field_validator('value')
    @classmethod
    def check_range(cls, v):
        if v > 100:
            raise ValueError("Value too large")
        return v
```

### Feature Processing Pattern

```python
def process_features(params: Params) -> DebriefCommand:
    """Process features."""
    features = params.feature_collection.features

    # Process each feature
    results = []
    for feature in features:
        # Process feature
        results.append(process_one(feature))

    return ShowDataCommand(payload={"results": results})
```

### Error Handling Pattern

```python
def safe_tool(params: Params) -> DebriefCommand:
    """Tool with error handling."""
    try:
        result = risky_operation(params)
        return ShowTextCommand(payload=f"Success: {result}")
    except ValueError as e:
        return ShowTextCommand(payload=f"Invalid input: {e}")
    except Exception as e:
        return ShowTextCommand(payload=f"Error: {e}")
```

## Integration with VS Code Extension

Future integration will allow:

1. Tool execution from Python scripts via MCP
2. Direct communication with VS Code extension
3. Maritime plot manipulation from Python
4. Seamless tool testing and debugging

## Future Development

Planned enhancements:

1. **Streaming Support**: Long-running tool execution with progress updates
2. **Caching**: Tool result caching for performance
3. **Metrics**: Tool execution timing and success rates
4. **Additional Tools**: More maritime analysis capabilities
5. **Multi-language**: Support for non-Python tool implementations

## Resources

- FastMCP Documentation: https://github.com/jlowin/fastmcp
- MCP Specification: https://spec.modelcontextprotocol.io/
- Pydantic Documentation: https://docs.pydantic.dev/
- Debrief Shared Types: ../../libs/shared-types/README.md
