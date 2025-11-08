.PHONY: help build clean install test lint typecheck

help:
	@echo "Available targets:"
	@echo "  build      - Build Python wheel and .pyz zipapp"
	@echo "  clean      - Remove build artifacts"
	@echo "  install    - Install package in development mode"
	@echo "  test       - Run tests"
	@echo "  lint       - Run code linting"
	@echo "  typecheck  - Run type checking"

build: clean
	@echo "Building tools-mcp package..."
	@python3 -m pip install build
	@python3 -m build
	@echo "Creating .pyz zipapp..."
	@python3 build_pyz.py
	@echo "Build complete!"
	@ls -lh dist/

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist/ build/ *.egg-info
	@rm -f tools-mcp.pyz
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean complete!"

install:
	@echo "Installing in development mode..."
	@python3 -m pip install -e .
	@echo "Install complete!"

test:
	@echo "Running tests..."
	@python3 test_server.py

lint:
	@echo "Running linting..."
	@ruff check src/

typecheck:
	@echo "Running type checking..."
	@mypy src/
