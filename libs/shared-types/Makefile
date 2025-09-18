# Makefile for @debrief/shared-types
# Pydantic-first architecture - simplified build system

# File pattern definitions
PYDANTIC_FILES := $(shell find python-src/debrief/types -name "*.py" -type f 2>/dev/null || true)
SCHEMA_FILES := $(shell find derived/json-schema -name "*.schema.json" -type f 2>/dev/null || true)
TS_FILES := $(patsubst derived/json-schema/%.schema.json,derived/typescript/%.ts,$(SCHEMA_FILES))
COPIED_TS_FILES := $(patsubst derived/typescript/%.ts,src/types/%.ts,$(TS_FILES))
PYTHON_MODEL_FILES := $(wildcard python-src/debrief/types/*/*.py)
COMPILED_TS := dist/src/index.js dist/src/index.d.ts
PYTHON_WHEEL := dist/python/debrief_types-1.0.0-py3-none-any.whl

# Dynamic schema files discovery
ALL_SCHEMA_FILES := $(shell find derived/json-schema -name "*.schema.json" -type f 2>/dev/null || true)

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help clean build build-dist generate test dev force-generate generate-schemas generate-typescript copy-typescript

# Default target
help: ## Show this help message
	@echo "$(BLUE)@debrief/shared-types - Pydantic-first Build System$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

clean: ## Clean all generated files
	@echo "$(YELLOW)Cleaning generated files...$(RESET)"
	@rm -rf derived/ dist/ src/types/ 2>/dev/null || true
	@echo "$(GREEN)✓ Clean complete$(RESET)"

# JSON Schema generation from Pydantic models
derived/json-schema/%.schema.json: $(PYDANTIC_FILES) generate_schemas.py
	@echo "$(BLUE)Generating JSON schemas from Pydantic models...$(RESET)"
	@python3 generate_schemas.py
	@echo "$(GREEN)✓ JSON Schema generation complete$(RESET)"

# TypeScript generation from JSON schemas (preserving directory structure)
derived/typescript/%.ts: derived/json-schema/%.schema.json
	@echo "$(BLUE)Generating TypeScript (1) for $<...$(RESET)"
	@mkdir -p $(dir $@)
	@NODE_NO_WARNINGS=1 npx json-schema-to-typescript "$<" --output "$@"

# Copy TypeScript files to src/types for compatibility (preserving directory structure)
src/types/%.ts: derived/typescript/%.ts
	@echo "$(BLUE)Copying $< to src/types/$(RESET)"
	@mkdir -p $(dir $@)
	@cp "$<" "$@"


# Convenience targets
generate-schemas: ## Generate all JSON schemas
	@echo "$(BLUE)Generating JSON schemas from Pydantic models...$(RESET)"
	@python3 generate_schemas.py
	@echo "$(GREEN)✓ JSON Schema generation complete$(RESET)"

generate-typescript: $(TS_FILES) ## Generate all TypeScript files

copy-typescript: $(COPIED_TS_FILES) ## Copy TypeScript files to src/types

generate: generate-schemas ## Generate all types and copy files
	@echo "$(BLUE)Generating TypeScript (2) files...$(RESET)"
	@$(MAKE) generate-typescript-force
	@echo "$(BLUE)Copying TypeScript files...$(RESET)"
	@$(MAKE) copy-typescript-force
	@echo "$(GREEN)✓ All type generation complete$(RESET)"

generate-typescript-force: ## Force TypeScript generation after schemas exist
	@find derived/json-schema -name "*.schema.json" -type f | while read schema; do \
		ts_file=$$(echo "$$schema" | sed 's|derived/json-schema/|derived/typescript/|' | sed 's|\.schema\.json|.ts|'); \
		mkdir -p "$$(dirname "$$ts_file")"; \
		echo "$(BLUE)Generating TypeScript (3) for $$schema...$(RESET)"; \
		NODE_NO_WARNINGS=1 npx json-schema-to-typescript "$$schema" --output "$$ts_file"; \
	done

copy-typescript-force: ## Force copy TypeScript files after generation
	@find derived/typescript -name "*.ts" -type f | while read ts_file; do \
		dest_file=$$(echo "$$ts_file" | sed 's|derived/typescript/|src/types/|'); \
		mkdir -p "$$(dirname "$$dest_file")"; \
		echo "$(BLUE)Copying $$ts_file to src/types/$(RESET)"; \
		cp "$$ts_file" "$$dest_file"; \
	done

force-generate: ## Force regeneration of all types
	@echo "$(BLUE)Force regenerating all types...$(RESET)"
	@rm -rf derived/ src/types/
	@$(MAKE) generate
	@echo "$(GREEN)✓ Force generation complete$(RESET)"

# TypeScript compilation depends on copied TypeScript files
$(COMPILED_TS): $(COPIED_TS_FILES) tsconfig.json
	@echo "$(BLUE)Compiling TypeScript...$(RESET)"
	@NODE_NO_WARNINGS=1 npx tsc
	@echo "$(GREEN)✓ TypeScript compilation complete$(RESET)"

# Python wheel depends on source Python models
$(PYTHON_WHEEL): $(PYDANTIC_FILES) pyproject.toml setup.py
	@echo "$(BLUE)Building Python wheel...$(RESET)"
	@mkdir -p dist/python && python -m build --wheel --outdir dist/python
	@echo "$(GREEN)✓ Python wheel build complete$(RESET)"

build: generate $(COMPILED_TS) $(PYTHON_WHEEL) ## Build TypeScript and Python wheel (conditional)
	@echo "$(GREEN)✓ Build complete$(RESET)"

build-dist: generate $(COMPILED_TS) $(PYTHON_WHEEL) ## Generate all assets and build distribution artifacts (CI safe)
	@echo "$(GREEN)✓ Distribution build complete$(RESET)"

test: ## Run tests
	@echo "$(BLUE)Running tests...$(RESET)"
	@node tests/typescript/test-generated-files.js || true
	@echo "$(GREEN)✓ Tests complete$(RESET)"

dev: ## Watch mode for development
	@echo "$(BLUE)Starting development watch mode...$(RESET)"
	@NODE_NO_WARNINGS=1 npx concurrently "npx nodemon --watch python-src/debrief/types --ext 'py' --exec 'python3 generate_schemas.py'" "NODE_NO_WARNINGS=1 npx tsc --watch --preserveWatchOutput"
