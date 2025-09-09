# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ToolVault Packager creates self-contained `.pyz` files containing both web interfaces and MCP-compatible REST endpoints. Each package includes tools, a React SPA frontend, and complete metadata for offline operation.

Refer to README.md for user documentation and DEVELOPERS.md for detailed architecture and API documentation.

## Development Commands

### Build System
- `npm run build` - Full build: clean, build SPA, create toolvault.pyz package
- `npm run build:spa` - Build only the React SPA frontend
- `npm run clean` - Remove build artifacts (*.pyz, tmp_package_contents/)

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