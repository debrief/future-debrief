# Tools MCP - Pure FastMCP Server for Maritime Analysis Tools

A clean, modern FastMCP server implementation that exposes maritime analysis tools via the Model Context Protocol (MCP).

## Overview

Tools MCP is a pure FastMCP implementation that provides a lightweight, standards-compliant MCP server for maritime analysis tools. It replaces the legacy REST-based tool serving strategy with native MCP support.

### Key Features

- **Pure FastMCP**: Native MCP server implementation using the FastMCP framework
- **9 Maritime Tools**: Complete set of tools for maritime analysis and visualization
- **Type-Safe**: Full Pydantic validation for inputs and outputs
- **Docker-Compatible**: Standard Python wheel distribution
- **MCP Inspector Ready**: Built-in support for MCP Inspector verification

## Architecture

### Package Structure

```
apps/tools-mcp/
├── src/
│   └── tools_mcp/
│       ├── __init__.py
│       ├── __main__.py
│       ├── server.py          # FastMCP server implementation
│       └── tools/              # Maritime analysis tools
│           ├── feature-management/
│           ├── selection/
│           ├── text/
│           ├── track-analysis/
│           └── viewport/
├── pyproject.toml
├── requirements.txt
├── Makefile
└── README.md
```

### Available Tools

The server provides 9 maritime analysis tools:

1. **selection_select_feature_start_time** - Select features by start time
2. **selection_fit_to_selection** - Fit viewport to selected features
3. **selection_select_all_visible** - Select all visible features in viewport
4. **track-analysis_track_speed_filter_fast** - Fast track speed filtering
5. **track-analysis_track_speed_filter** - Comprehensive track speed filtering
6. **text_word_count** - Text word counting utility
7. **viewport_viewport_grid_generator** - Generate viewport grid overlays
8. **feature-management_toggle_first_feature_color** - Toggle feature colors
9. **feature-management_delete_features** - Delete selected features

## Installation

### Prerequisites

- Python 3.10 or later
- pip or uv package manager
- Access to the shared-types package

### Development Installation

```bash
# Clone the repository
cd apps/tools-mcp

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install in development mode
pip install -e .
```

### Production Installation

```bash
# Install from wheel
pip install dist/tools_mcp-1.0.0-py3-none-any.whl
```

## Usage

### Running the Server

```bash
# Using the installed command
tools-mcp

# Or run directly with Python
python -m tools_mcp

# Or execute the module
python -m tools_mcp.server
```

The server will start and register all available tools. By default, FastMCP listens on stdio for MCP communication.

### Testing the Server

```bash
# Run the test script
python test_server.py
```

### Building Distribution Packages

```bash
# Build Python wheel
python -m build

# Or use Make
make build
```

## Development

### Project Structure

- **server.py**: Core FastMCP server implementation with tool discovery
- **tools/**: Maritime analysis tool implementations
- **test_server.py**: Simple test script for validation

### Adding New Tools

1. Create a new directory under `src/tools_mcp/tools/{category}/{tool_name}/`
2. Add an `execute.py` file with:
   - A Pydantic parameters model
   - A single public function that takes params and returns a DebriefCommand
3. The tool will be automatically discovered and registered

Example:

```python
from pydantic import BaseModel, Field
from debrief.types.tools import ShowTextCommand, DebriefCommand

class MyToolParameters(BaseModel):
    """Parameters for my_tool."""
    text: str = Field(description="Input text")

def my_tool(params: MyToolParameters) -> DebriefCommand:
    """Process the input text."""
    result = params.text.upper()
    return ShowTextCommand(payload=f"Result: {result}")
```

### Code Quality

```bash
# Linting
make lint
# or
ruff check src/

# Type checking
make typecheck
# or
mypy src/

# Run all checks
ruff check src/ && mypy src/
```

## Tool Command Types

All tools return DebriefCommand objects that trigger actions in the maritime analysis platform:

- **ShowTextCommand**: Display text to the user
- **ShowDataCommand**: Display structured data
- **SetSelectionCommand**: Update feature selection
- **SetViewportCommand**: Update map viewport
- **SetTimeStateCommand**: Update time state
- **AddFeaturesCommand**: Add new features to the map
- **UpdateFeaturesCommand**: Update existing features
- **DeleteFeaturesCommand**: Remove features from the map
- **SetFeatureCollectionCommand**: Replace entire feature collection
- **ShowImageCommand**: Display an image
- **LogMessageCommand**: Log a message
- **CompositeCommand**: Execute multiple commands in sequence

## MCP Inspector Integration

The server can be inspected and tested using the MCP Inspector tool:

```bash
# Install MCP Inspector
pip install mcp-inspector

# Inspect the server
mcp-inspector tools-mcp
```

## Dependencies

### Runtime Dependencies

- **fastmcp**: FastMCP framework for MCP server implementation
- **pydantic**: Data validation and settings management
- **geojson-pydantic**: GeoJSON validation support
- **jsonschema**: JSON schema validation
- **debrief-types**: Shared types from the monorepo

### Development Dependencies

- **ruff**: Code linting and formatting
- **mypy**: Static type checking
- **pytest**: Testing framework
- **mcp-inspector**: MCP server inspection tool

## Deployment

### Docker Integration

The package is designed to work with Docker deployments. The Python wheel can be installed in a Docker container:

```dockerfile
FROM python:3.11-slim

# Install the wheel
COPY dist/tools_mcp-1.0.0-py3-none-any.whl /tmp/
RUN pip install /tmp/tools_mcp-1.0.0-py3-none-any.whl

# Run the server
CMD ["tools-mcp"]
```

### VS Code Extension Integration

Future versions will integrate with the VS Code extension for seamless tool execution from Python scripts.

## Known Limitations

1. **Binary Dependencies**: The .pyz zipapp format is not recommended due to binary extension compatibility issues with pydantic-core and other native dependencies. Use the Python wheel distribution instead.

2. **Tool Discovery**: Tools must follow the exact directory structure and naming conventions for automatic discovery.

3. **Error Handling**: Tool errors are returned as ShowTextCommand objects with error messages.

## Troubleshooting

### Import Errors

If you encounter import errors for `debrief.types`:

```bash
# Ensure shared-types is installed
pip install -e ../../libs/shared-types
```

### Tool Not Found

If a tool isn't being discovered:

1. Check the directory structure matches `tools/{category}/{tool_name}/execute.py`
2. Ensure the execute.py has exactly one public function
3. Verify the function has proper type hints with a Pydantic parameter model
4. Check the function returns a DebriefCommand

### FastMCP Connection Issues

For connection issues:

1. Verify FastMCP is installed: `pip show fastmcp`
2. Check Python version is 3.10+
3. Review FastMCP logs for detailed error messages

## Contributing

When contributing new tools or features:

1. Follow the existing code structure
2. Add proper type hints and docstrings
3. Include parameter validation with Pydantic
4. Test with the test_server.py script
5. Update documentation as needed

## License

MIT License - See repository root for details.

## Related Packages

- **libs/shared-types**: Shared type definitions and validators
- **libs/tool-vault-packager**: Legacy REST-based tool serving (deprecated)
- **apps/vs-code**: VS Code extension for maritime analysis

## Future Enhancements

- [ ] VS Code extension integration
- [ ] Additional maritime analysis tools
- [ ] Streaming tool execution support
- [ ] Tool execution metrics and logging
- [ ] Multi-language tool support
