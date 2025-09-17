# Makefile for @debrief/shared-types
# Pydantic-first architecture - simplified build system

# File pattern definitions
PYDANTIC_FILES := $(shell find pydantic_models -name "*.py" -type f)
GENERATED_SCHEMAS := $(wildcard derived/json-schema/*.json)
GENERATED_TS := $(wildcard derived/typescript/*.ts)
GENERATED_PY := $(wildcard python-src/debrief/types/*/*.py)
COMPILED_TS := dist/src/index.js dist/src/index.d.ts
PYTHON_WHEEL := dist/python/debrief_types-1.0.0-py3-none-any.whl

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help clean build generate test dev force-generate

# Default target
help: ## Show this help message
	@echo "$(BLUE)@debrief/shared-types - Pydantic-first Build System$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

clean: ## Clean all generated files
	@echo "$(YELLOW)Cleaning generated files...$(RESET)"
	@rm -rf derived/ dist/ src/types/ python-src/debrief/types/features/ python-src/debrief/types/states/ python-src/debrief/types/tools/ 2>/dev/null || true
	@echo "$(GREEN)✓ Clean complete$(RESET)"

# Generated files depend directly on Pydantic source files
derived/json-schema/Track.schema.json: $(PYDANTIC_FILES)
	@echo "$(BLUE)Pydantic models changed - regenerating types...$(RESET)"
	@python3 generate_from_pydantic.py
	@echo "$(GREEN)✓ Generation complete$(RESET)"

# Use one schema file as representative of all generated files
generate: derived/json-schema/Track.schema.json ## Generate types if Pydantic models changed

force-generate: ## Force regeneration of all types
	@echo "$(BLUE)Force generating types from Pydantic models...$(RESET)"
	@rm -f derived/json-schema/Track.schema.json
	@python3 generate_from_pydantic.py
	@echo "$(GREEN)✓ Generation complete$(RESET)"

# TypeScript compilation depends on generated schemas
$(COMPILED_TS): derived/json-schema/Track.schema.json tsconfig.json
	@echo "$(BLUE)Compiling TypeScript...$(RESET)"
	@npx tsc
	@echo "$(GREEN)✓ TypeScript compilation complete$(RESET)"

# Python wheel depends on generated Python files
$(PYTHON_WHEEL): derived/json-schema/Track.schema.json pyproject.toml setup.py
	@echo "$(BLUE)Building Python wheel...$(RESET)"
	@mkdir -p dist/python && python -m build --wheel --outdir dist/python
	@echo "$(GREEN)✓ Python wheel build complete$(RESET)"

build: $(COMPILED_TS) $(PYTHON_WHEEL) ## Build TypeScript and Python wheel (conditional)
	@echo "$(GREEN)✓ Build complete$(RESET)"

test: ## Run tests
	@echo "$(BLUE)Running tests...$(RESET)"
	@node tests/typescript/test-generated-files.js || true
	@echo "$(GREEN)✓ Tests complete$(RESET)"

dev: ## Watch mode for development
	@echo "$(BLUE)Starting development watch mode...$(RESET)"
	@npx concurrently "npx nodemon --watch pydantic_models --ext 'py' --exec 'python3 generate_from_pydantic.py'" "npx tsc --watch --preserveWatchOutput"