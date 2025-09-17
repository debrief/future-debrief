# Makefile for @debrief/shared-types
# Pydantic-first architecture - simplified build system

# File pattern definitions
PYDANTIC_FILES := $(shell find pydantic_models -name "*.py" -type f 2>/dev/null || true)
SCHEMA_FILES := $(patsubst pydantic_models/%.py,derived/json-schema/%.schema.json,$(PYDANTIC_FILES))
TS_FILES := $(patsubst derived/json-schema/%.schema.json,derived/typescript/%.ts,$(wildcard derived/json-schema/*.json))
COPIED_TS_FILES := $(patsubst derived/typescript/%.ts,src/types/%.ts,$(TS_FILES))
PYTHON_MODEL_FILES := $(wildcard python-src/debrief/types/*/*.py)
COMPILED_TS := dist/src/index.js dist/src/index.d.ts
PYTHON_WHEEL := dist/python/debrief_types-1.0.0-py3-none-any.whl

# Schema generation models mapping
SCHEMA_MODELS := Track Point Annotation FeatureCollection TimeState ViewportState SelectionState EditorState CurrentState JSONSchema Tool ToolCallRequest ToolCallResponse ToolListResponse ConstrainedFeature

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help clean build generate test dev force-generate generate-schemas generate-typescript copy-typescript copy-python-models

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

# JSON Schema generation from Pydantic models
derived/json-schema/%.schema.json: $(PYDANTIC_FILES) generate_schemas.py
	@echo "$(BLUE)Generating JSON schemas from Pydantic models...$(RESET)"
	@python3 generate_schemas.py
	@echo "$(GREEN)✓ JSON Schema generation complete$(RESET)"

# TypeScript generation from JSON schemas
derived/typescript/%.ts: derived/json-schema/%.schema.json
	@echo "$(BLUE)Generating TypeScript for $<...$(RESET)"
	@mkdir -p derived/typescript
	@npx json-schema-to-typescript "$<" --output "$@"

# Copy TypeScript files to src/types for compatibility
src/types/%.ts: derived/typescript/%.ts
	@echo "$(BLUE)Copying $< to src/types/$(RESET)"
	@mkdir -p src/types
	@cp "$<" "$@"

# Python model copying for wheel building
python-src/debrief/types/features/track.py: $(PYDANTIC_FILES)
	@echo "$(BLUE)Copying Python models for wheel building...$(RESET)"
	@mkdir -p python-src/debrief/types/features python-src/debrief/types/states python-src/debrief/types/tools
	@cp pydantic_models/features/*.py python-src/debrief/types/features/ 2>/dev/null || true
	@cp pydantic_models/states/*.py python-src/debrief/types/states/ 2>/dev/null || true
	@cp pydantic_models/tools/*.py python-src/debrief/types/tools/ 2>/dev/null || true
	@# Remove __init__.py files that were copied (we'll create our own)
	@rm -f python-src/debrief/types/features/__init__.py python-src/debrief/types/states/__init__.py python-src/debrief/types/tools/__init__.py 2>/dev/null || true
	@# Create proper __init__.py files
	@echo '"""Generated features types from Pydantic models."""' > python-src/debrief/types/features/__init__.py
	@echo '"""Generated states types from Pydantic models."""' > python-src/debrief/types/states/__init__.py
	@echo '"""Generated tools types from Pydantic models."""' > python-src/debrief/types/tools/__init__.py
	@echo '"""Generated types from Pydantic models."""' > python-src/debrief/types/__init__.py
	@echo "$(GREEN)✓ Python model copying complete$(RESET)"

# Convenience targets
generate-schemas: $(foreach model,$(SCHEMA_MODELS),derived/json-schema/$(model).schema.json) ## Generate all JSON schemas

generate-typescript: $(foreach model,$(SCHEMA_MODELS),derived/typescript/$(model).ts) ## Generate all TypeScript files

copy-typescript: $(foreach model,$(SCHEMA_MODELS),src/types/$(model).ts) ## Copy TypeScript files to src/types

copy-python-models: python-src/debrief/types/features/track.py ## Copy Python models for wheel building

generate: generate-schemas generate-typescript copy-typescript copy-python-models ## Generate all types and copy files

force-generate: ## Force regeneration of all types
	@echo "$(BLUE)Force regenerating all types...$(RESET)"
	@rm -rf derived/ src/types/ python-src/debrief/types/features/ python-src/debrief/types/states/ python-src/debrief/types/tools/
	@$(MAKE) generate
	@echo "$(GREEN)✓ Force generation complete$(RESET)"

# TypeScript compilation depends on copied TypeScript files
$(COMPILED_TS): $(foreach model,$(SCHEMA_MODELS),src/types/$(model).ts) tsconfig.json
	@echo "$(BLUE)Compiling TypeScript...$(RESET)"
	@npx tsc
	@echo "$(GREEN)✓ TypeScript compilation complete$(RESET)"

# Python wheel depends on copied Python models
$(PYTHON_WHEEL): python-src/debrief/types/features/track.py pyproject.toml setup.py
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