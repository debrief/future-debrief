# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ToolVault Packager creates self-contained `.pyz` files containing both web interfaces and MCP-compatible REST endpoints. Each package includes tools, a React SPA frontend, and complete metadata for offline operation.

**CRITICAL**: This package uses **npm** (not pnpm) due to Docker deployment constraints and maintains its own `package-lock.json`. The SPA subdirectory also uses npm with its own `package-lock.json`.

Refer to README.md for user documentation and DEVELOPERS.md for detailed architecture and API documentation.

## Development Commands

### Build System
- `npm run build` - Full build: clean, build SPA, create toolvault.pyz package
- `npm run build:spa` - Build SPA with automatic shared-types copying
- `npm run copy-shared-types` - Copy shared-types package to local directory
- `npm run clean` - Remove build artifacts (*.pyz, tmp_package_contents/, shared-types/)

### Development Servers
- `npm run serve` - Start production server using CLI
- `npm run dev:spa` - Start SPA dev server (connects to localhost:8000 backend)
- `npm run dev:spa:with-backend` - Start SPA dev server with backend override (localhost:8001)

### Testing
- `npm test` - Verify toolvault.pyz package exists
- `npm run test:playwright` - Run Playwright integration tests
- `npm run test:playwright:ui` - Run Playwright tests with UI
- `npm run test:playwright:both` - Run tests against both dev server and pyz package

### Direct Python Commands
```bash
# Start server for development
python cli.py serve --port 8000

# List available tools
python cli.py --tools-path tools list-tools

# Call a specific tool
python cli.py --tools-path tools call-tool word_count '{"text": "Hello world"}'

# Create package manually
python packager.py tools --output toolvault.pyz
```

### SPA Development
```bash
cd spa
npm install
npm run dev          # Standard development
npm run lint         # ESLint checking
npm run build        # TypeScript compile + Vite build
```

### Shared-Types Dependency Management

**IMPORTANT**: This package uses `file:` dependencies instead of workspace dependencies due to Docker constraints:

- **Dependencies**: Use `file:./shared-types` for npm compatibility
- **Build process**: Copies shared-types sources before building
- **Simple approach**: No symlinks or temporary modifications needed

#### Build Process Details
```bash
# The build:spa script automatically:
# 1. Copies shared-types package to local shared-types/ directory
# 2. Runs npm install (resolves file: dependency)
# 3. Builds SPA with TypeScript compilation

npm run build:spa    # Handles all dependency copying automatically
```

#### Dependency Resolution
- **Local development**: Copies from `../../libs/shared-types`
- **Docker/CI context**: Uses pre-staged `shared-types` directory
- **Simple file dependency**: npm understands `file:../shared-types`

## Architecture

### Core Modules
- **cli.py** - Command-line interface and entry point
- **discovery.py** - Tool discovery, metadata extraction, type annotation parsing
- **server.py** - FastAPI server with MCP endpoints, SPA integration, CORS handling
- **packager.py** - .pyz packaging system with SPA build integration
- **validation.py** - Input/output validation using Pydantic

### Dual Runtime System
- **Development Mode**: Direct Python execution with live SPA development server
- **Production Mode**: Self-contained .pyz file with embedded SPA assets

### Tool Structure
Tools in `tools/` directory must:
- Be single Python files with exactly one public function
- Include complete type annotations for parameters and return values
- Have descriptive docstrings (first sentence used as short description)
- Optional `inputs/` folder for sample data

### Package Contents
Generated .pyz files contain:
- MCP-compatible tool schemas (`index.json`)
- Tool navigation indexes (`tools/{tool}/tool.json`)
- HTML-formatted source code (`metadata/source_code.html`)
- Git history metadata (`metadata/git_history.json`)
- Sample input files (`inputs/*.json`)
- Complete React SPA in `static/` directory

### API Endpoints
- `GET /tools/list` - MCP-compatible tool listing
- `POST /tools/call` - Tool execution endpoint
- `GET /api/tools/{path}` - Direct file access for SPA navigation
- `GET /ui/` - Integrated SPA interface
- `GET /health` - Health check endpoint

## Dependencies

### Python
- FastAPI + Uvicorn - Web framework and ASGI server
- Pydantic - Data validation and settings
- Pygments - Source code syntax highlighting (optional)
- Python 3.9+ required

### Frontend (spa/)
- React 19.1+ with TypeScript
- Vite - Build tool and dev server
- ESLint - Code linting

## Testing Strategy

### Integration Testing
Playwright tests run against both:
1. Development server (direct Python execution)
2. Production .pyz package

Use `test-runner.js` to orchestrate test scenarios.

### Manual Testing
```bash
# Test package creation
npm run build && test -f toolvault.pyz

# Test server endpoints
curl http://localhost:8000/tools/list
curl -X POST http://localhost:8000/tools/call -H 'Content-Type: application/json' -d '{"name": "word_count", "arguments": {"text": "test"}}'

# Test SPA
open http://localhost:8000/ui/
```

## Tool Development Workflow

### Creating New Tools
1. Create a new `.py` file in the `tools/` directory
2. Implement exactly one public function with complete type annotations
3. Add a descriptive docstring (first sentence becomes the tool description)
4. Optionally create an `inputs/` folder with sample data files
5. Test the tool: `python cli.py --tools-path tools call-tool <tool_name> '<json_args>'`
6. Rebuild package: `npm run build`

### Tool Requirements
```python
"""Example tool template."""

def example_tool(param: str, count: int = 1) -> dict:
    """
    Brief description that appears in the tool list.
    
    Args:
        param: Description of the parameter
        count: Optional parameter with default value
        
    Returns:
        Dictionary containing the result
    """
    return {"result": param * count}
```

### File Structure for Tools
```
tools/
├── word_count.py              # Single tool file
├── complex_tool/              # Tool with sample data
│   ├── complex_tool.py        # Tool implementation
│   └── inputs/                # Sample input files
│       ├── sample1.json
│       └── sample2.json
```

## Common Development Tasks

### Debugging Tools
```bash
# Test a specific tool directly
python cli.py --tools-path tools call-tool <tool_name> '<json_arguments>'

# List all discovered tools and their schemas
python cli.py --tools-path tools list-tools

# Check tool metadata and validation
python -c "from discovery import discover_tools; print(discover_tools('tools/'))"
```

### SPA Development
```bash
# Start SPA dev server with hot reload (connects to localhost:8000)
npm run dev:spa

# Start SPA dev server with custom backend
npm run dev:spa:with-backend

# Lint and build SPA
cd spa && npm run lint && npm run build
```

### Package Testing
```bash
# Full integration test
npm run build && python toolvault.pyz serve --port 8000 &
curl http://localhost:8000/tools/list
kill %1

# Test specific scenarios
npm run test:playwright:both  # Test both dev and production modes
```

## Troubleshooting

### Common Issues
- **Import errors**: Ensure tools use only standard library or include dependencies in requirements.txt
- **Type annotation missing**: All tool parameters and return values must have type annotations
- **Multiple public functions**: Each tool file must have exactly one public (non-underscore) function
- **SPA build fails**: Run `cd spa && npm install` if dependencies are missing
- **Package not found**: Ensure you're in the tool-vault-packager directory when running npm commands

### Important File Locations
- Tool schemas: Generated in `index.json` and `tools/{tool}/tool.json`
- Built SPA assets: Embedded in `static/` directory within .pyz file
- Package metadata: `metadata/` directory contains source code and git history
- Temporary build: `tmp_package_contents/` (cleaned automatically)