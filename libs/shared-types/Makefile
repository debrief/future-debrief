# Makefile for @debrief/shared-types
# Pydantic-first architecture - simplified build system

# File pattern definitions
PYDANTIC_FILES := $(shell find python-src/debrief/types -name "*.py" -type f || true)
PYTHON_DEPS_STAMP := .python-deps-installed
# Define expected schema files based on known structure (avoid shell dependency issues)
EXPECTED_SCHEMAS := derived/json-schema/features/track.schema.json \
                   derived/json-schema/features/point.schema.json \
                   derived/json-schema/features/annotation.schema.json \
                   derived/json-schema/features/metadata_viewport.schema.json \
                   derived/json-schema/features/metadata_time.schema.json \
                   derived/json-schema/features/metadata_selection.schema.json \
                   derived/json-schema/features/buoyfield.schema.json \
                   derived/json-schema/features/backdrop.schema.json \
                   derived/json-schema/features/debrief_feature_collection.schema.json \
                   derived/json-schema/states/time_state.schema.json \
                   derived/json-schema/states/viewport_state.schema.json \
                   derived/json-schema/states/selection_state.schema.json \
                   derived/json-schema/states/editor_state.schema.json \
                   derived/json-schema/states/current_state.schema.json \
                   derived/json-schema/tools/json_schema.schema.json \
                   derived/json-schema/tools/tool.schema.json \
                   derived/json-schema/tools/tool_call_request.schema.json \
                   derived/json-schema/tools/tool_call_response.schema.json \
                   derived/json-schema/tools/tool_list_response.schema.json \
                   derived/json-schema/tools/constrained_feature.schema.json \
                   derived/json-schema/tools/tool_file_reference.schema.json \
                   derived/json-schema/tools/sample_input_reference.schema.json \
                   derived/json-schema/tools/git_history_entry.schema.json \
                   derived/json-schema/tools/git_author.schema.json \
                   derived/json-schema/tools/git_history.schema.json \
                   derived/json-schema/tools/tool_stats.schema.json \
                   derived/json-schema/tools/tool_index.schema.json \
                   derived/json-schema/tools/tool_files_collection.schema.json \
                   derived/json-schema/tools/global_tool_index.schema.json \
                   derived/json-schema/tools/package_info.schema.json \
                   derived/json-schema/tools/tool_metadata.schema.json \
                   derived/json-schema/tools/sample_input_data.schema.json \
                   derived/json-schema/tools/add_features_command.schema.json \
                   derived/json-schema/tools/update_features_command.schema.json \
                   derived/json-schema/tools/delete_features_command.schema.json \
                   derived/json-schema/tools/set_feature_collection_command.schema.json \
                   derived/json-schema/tools/set_viewport_command.schema.json \
                   derived/json-schema/tools/set_selection_command.schema.json \
                   derived/json-schema/tools/show_text_command.schema.json \
                   derived/json-schema/tools/show_data_command.schema.json \
                   derived/json-schema/tools/show_image_command.schema.json \
                   derived/json-schema/tools/log_message_command.schema.json \
                   derived/json-schema/tools/log_message_payload.schema.json
TS_FILES := $(patsubst derived/json-schema/%.schema.json,derived/typescript/%.ts,$(EXPECTED_SCHEMAS))
COPIED_TS_FILES := $(patsubst derived/typescript/%.ts,src/types/%.ts,$(TS_FILES))
ZOD_FILES := $(patsubst derived/json-schema/%.schema.json,derived/zod/%.ts,$(EXPECTED_SCHEMAS))
COPIED_ZOD_FILES := $(patsubst derived/zod/%.ts,src/zod/%.ts,$(ZOD_FILES))
PYTHON_MODEL_FILES := $(wildcard python-src/debrief/types/*/*.py)
COMPILED_TS := dist/src/index.js dist/src/index.d.ts
PYTHON_WHEEL := dist/python/debrief_types-1.0.0-py3-none-any.whl

# Dynamic schema files discovery
ALL_SCHEMA_FILES := $(shell find derived/json-schema -name "*.schema.json" -type f || true)

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help clean build build-dist generate test dev force-generate generate-schemas generate-typescript generate-zod copy-typescript copy-zod copy-to-tool-vault-packager verify verify-artifacts verify-tests verify-typecheck

# Default target
help: ## Show this help message
	@echo "$(BLUE)@debrief/shared-types - Pydantic-first Build System$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

clean: ## Clean all generated files
	@echo "$(YELLOW)Cleaning generated files...$(RESET)"
	@rm -rf derived/ dist/ src/types/ || true
	@find src/zod -type f -name "*.ts" ! -name "index.ts" -delete 2>/dev/null || true
	@rm -f $(PYTHON_DEPS_STAMP)
	@echo "$(GREEN)✓ Clean complete$(RESET)"

$(PYTHON_DEPS_STAMP): requirements.txt
	@echo "$(BLUE)Installing Python build dependencies...$(RESET)"
	@pip install -r requirements.txt
	@touch $(PYTHON_DEPS_STAMP)
	@echo "$(GREEN)✓ Python dependencies installed$(RESET)"

# JSON Schema generation from Pydantic models - triggered by any Pydantic file change
derived/json-schema/.schemas-generated: $(PYTHON_DEPS_STAMP) $(PYDANTIC_FILES) generate_schemas.py
	@echo "$(BLUE)Generating JSON schemas from Pydantic models...$(RESET)"
	@python3 generate_schemas.py
	@touch derived/json-schema/.schemas-generated
	@echo "$(GREEN)✓ JSON Schema generation complete$(RESET)"

# TypeScript generation from JSON schemas (preserving directory structure)
$(TS_FILES): derived/json-schema/.schemas-generated
	@echo "$(BLUE)Generating TypeScript files from schemas...$(RESET)"
	@for schema in $(EXPECTED_SCHEMAS); do \
		if [ -f "$$schema" ]; then \
			ts_file=$$(echo "$$schema" | sed 's|derived/json-schema/|derived/typescript/|' | sed 's|\.schema\.json|.ts|'); \
			mkdir -p "$$(dirname "$$ts_file")"; \
			if [ ! -f "$$ts_file" ] || [ "$$schema" -nt "$$ts_file" ]; then \
				echo "$(BLUE)  Generating $$ts_file...$(RESET)"; \
				NODE_NO_WARNINGS=1 npx json-schema-to-typescript "$$schema" --output "$$ts_file"; \
			fi; \
		fi; \
	done
	@touch $(TS_FILES)

# Copy TypeScript files to src/types for compatibility (preserving directory structure)
$(COPIED_TS_FILES): $(TS_FILES)
	@echo "$(BLUE)Copying TypeScript files to src/types/$(RESET)"
	@for ts_file in $(TS_FILES); do \
		if [ -f "$$ts_file" ]; then \
			dest_file=$$(echo "$$ts_file" | sed 's|derived/typescript/|src/types/|'); \
			mkdir -p "$$(dirname "$$dest_file")"; \
			if [ ! -f "$$dest_file" ] || [ "$$ts_file" -nt "$$dest_file" ]; then \
				echo "$(BLUE)  Copying $$ts_file...$(RESET)"; \
				cp "$$ts_file" "$$dest_file"; \
			fi; \
		fi; \
	done
	@touch $(COPIED_TS_FILES)

# Zod schema generation from JSON schemas (preserving directory structure)
$(ZOD_FILES): derived/json-schema/.schemas-generated
	@echo "$(BLUE)Generating Zod schemas from JSON schemas...$(RESET)"
	@for schema in $(EXPECTED_SCHEMAS); do \
		if [ -f "$$schema" ]; then \
			zod_file=$$(echo "$$schema" | sed 's|derived/json-schema/|derived/zod/|' | sed 's|\.schema\.json|.ts|'); \
			mkdir -p "$$(dirname "$$zod_file")"; \
			if [ ! -f "$$zod_file" ] || [ "$$schema" -nt "$$zod_file" ]; then \
				echo "$(BLUE)  Generating $$zod_file...$(RESET)"; \
				NODE_NO_WARNINGS=1 npx json-schema-to-zod --input "$$schema" --output "$$zod_file" --module esm; \
			fi; \
		fi; \
	done
	@touch $(ZOD_FILES)

# Copy Zod files to src/zod for compatibility (preserving directory structure)
$(COPIED_ZOD_FILES): $(ZOD_FILES)
	@echo "$(BLUE)Copying Zod schemas to src/zod/$(RESET)"
	@for zod_file in $(ZOD_FILES); do \
		if [ -f "$$zod_file" ]; then \
			dest_file=$$(echo "$$zod_file" | sed 's|derived/zod/|src/zod/|'); \
			mkdir -p "$$(dirname "$$dest_file")"; \
			if [ ! -f "$$dest_file" ] || [ "$$zod_file" -nt "$$dest_file" ]; then \
				echo "$(BLUE)  Copying $$zod_file...$(RESET)"; \
				cp "$$zod_file" "$$dest_file"; \
			fi; \
		fi; \
	done
	@touch $(COPIED_ZOD_FILES)


# Convenience targets
generate-schemas: ## Generate all JSON schemas
	@echo "$(BLUE)Generating JSON schemas from Pydantic models...$(RESET)"
	@python3 generate_schemas.py
	@echo "$(GREEN)✓ JSON Schema generation complete$(RESET)"

generate-typescript: $(TS_FILES) ## Generate all TypeScript files

copy-typescript: $(COPIED_TS_FILES) ## Copy TypeScript files to src/types

generate-zod: $(ZOD_FILES) ## Generate all Zod schemas

copy-zod: $(COPIED_ZOD_FILES) ## Copy Zod schemas to src/zod

generate: $(PYTHON_DEPS_STAMP) derived/json-schema/.schemas-generated $(COPIED_TS_FILES) $(COPIED_ZOD_FILES) ## Generate all types and copy files (conditional)
	@echo "$(GREEN)✓ All type generation complete (TypeScript + Zod)$(RESET)"

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
$(COMPILED_TS): $(COPIED_TS_FILES) $(COPIED_ZOD_FILES) tsconfig.json
	@echo "$(BLUE)Compiling TypeScript...$(RESET)"
	@NODE_NO_WARNINGS=1 npx tsc
	@echo "$(GREEN)✓ TypeScript compilation complete$(RESET)"

# Python wheel depends on source Python models
$(PYTHON_WHEEL): $(PYDANTIC_FILES) pyproject.toml setup.py
	@echo "$(BLUE)Building Python wheel...$(RESET)"
	@mkdir -p dist/python && python -m build --wheel --outdir dist/python
	@echo "$(GREEN)✓ Python wheel build complete$(RESET)"

copy-to-tool-vault-packager: ## Copy Python sources and required TypeScript types to tool-vault-packager
	@echo "$(BLUE)Copying sources to tool-vault-packager...$(RESET)"
	@if [ -d "../tool-vault-packager" ]; then \
		echo "$(BLUE)Found tool-vault-packager, updating sources...$(RESET)"; \
		rm -rf ../tool-vault-packager/shared-types; \
		mkdir -p ../tool-vault-packager/shared-types/src; \
		cp -r python-src ../tool-vault-packager/shared-types/; \
		cp pyproject.toml setup.py ../tool-vault-packager/shared-types/ || true; \
		if [ -d "src/types" ]; then \
			cp -r src/types ../tool-vault-packager/shared-types/src/; \
			echo "$(BLUE)  Copied TypeScript types for SPA$(RESET)"; \
		fi; \
		if [ -f "src/index.ts" ]; then \
			cp src/index.ts ../tool-vault-packager/shared-types/src/; \
			echo "$(BLUE)  Copied TypeScript index file$(RESET)"; \
		fi; \
		if [ -d "dist/python" ]; then \
			mkdir -p ../tool-vault-packager/shared-types/dist; \
			cp -r dist/python ../tool-vault-packager/shared-types/dist/; \
			echo "$(BLUE)  Copied Python wheel for packaging$(RESET)"; \
		fi; \
		echo '{' > ../tool-vault-packager/shared-types/package.json; \
		echo '  "name": "@debrief/shared-types",' >> ../tool-vault-packager/shared-types/package.json; \
		echo '  "version": "1.0.0",' >> ../tool-vault-packager/shared-types/package.json; \
		echo '  "description": "Shared types for Debrief maritime analysis platform",' >> ../tool-vault-packager/shared-types/package.json; \
		echo '  "main": "src/index.ts",' >> ../tool-vault-packager/shared-types/package.json; \
		echo '  "types": "src/index.ts"' >> ../tool-vault-packager/shared-types/package.json; \
		echo '}' >> ../tool-vault-packager/shared-types/package.json; \
		echo "$(GREEN)✓ Copied sources to tool-vault-packager (Python: $(shell du -sh python-src | cut -f1), TypeScript: $(shell test -d src/types && du -sh src/types | cut -f1 || echo 'N/A'), Wheel: $(shell test -d dist/python && du -sh dist/python | cut -f1 || echo 'N/A'))$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ tool-vault-packager not found, skipping copy$(RESET)"; \
	fi

build: generate $(COMPILED_TS) $(PYTHON_WHEEL) copy-to-tool-vault-packager ## Build TypeScript and Python wheel (conditional)
	@echo "$(GREEN)✓ Build complete$(RESET)"

build-dist: generate $(COMPILED_TS) $(PYTHON_WHEEL) copy-to-tool-vault-packager ## Generate all assets and build distribution artifacts (CI safe)
	@echo "$(GREEN)✓ Distribution build complete$(RESET)"

test: ## Run tests
	@echo "$(BLUE)Running tests...$(RESET)"
	@node tests/typescript/test-generated-files.js || true
	@echo "$(GREEN)✓ Tests complete$(RESET)"

dev: ## Watch mode for development
	@echo "$(BLUE)Starting development watch mode...$(RESET)"
	@NODE_NO_WARNINGS=1 npx concurrently "npx nodemon --watch python-src/debrief/types --ext 'py' --exec 'python3 generate_schemas.py'" "NODE_NO_WARNINGS=1 npx tsc --watch --preserveWatchOutput"

verify: verify-artifacts verify-typecheck verify-contents ## Fast verification (timestamp-based)
	@echo "$(GREEN)✅ All shared-types verifications passed!$(RESET)"

verify-artifacts: ## Verify build artifacts are up-to-date
	@NEWEST_PY=$$(find python-src/debrief/types -name "*.py" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-); \
	if [ -z "$$NEWEST_PY" ]; then \
		echo "$(RED)❌ [@debrief/shared-types] No Pydantic source files found$(RESET)"; \
		exit 1; \
	fi; \
	for file in derived/json-schema/features/track.schema.json src/types/features/track.ts dist/src/index.js; do \
		if [ ! -f "$$file" ]; then \
			echo "$(RED)❌ [@debrief/shared-types] Missing build artifact: $$file$(RESET)"; \
			echo "$(BLUE)💡 Run: make generate$(RESET)"; \
			exit 1; \
		elif [ "$$file" -ot "$$NEWEST_PY" ]; then \
			echo "$(RED)❌ [@debrief/shared-types] $$file is older than Pydantic sources$(RESET)"; \
			echo "$(BLUE)💡 Source file: $$NEWEST_PY$(RESET)"; \
			echo "$(BLUE)💡 Run: make generate$(RESET)"; \
			exit 1; \
		fi; \
	done

verify-tests: ## Run tests without rebuilding
	@echo "$(BLUE)Running tests...$(RESET)"
	@node tests/typescript/test-generated-files.js && \
	 python3 tests/python/test_generated_files.py && \
	 echo "$(GREEN)✅ Tests passed$(RESET)" || (echo "$(RED)❌ Tests failed$(RESET)" && exit 1)

verify-typecheck: ## Type check without compilation
	@NODE_NO_WARNINGS=1 npx tsc --noEmit || (echo "$(RED)❌ Type check failed$(RESET)" >&2 && exit 1)

verify-contents: ## Verify build artifact contents
	@if [ -f "$(PYTHON_WHEEL)" ]; then \
		if ! python -m zipfile -l "$(PYTHON_WHEEL)" | grep -q "debrief/types"; then \
			echo "$(RED)❌ [@debrief/shared-types] Python wheel missing debrief.types modules$(RESET)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)❌ [@debrief/shared-types] Python wheel not found$(RESET)"; \
		exit 1; \
	fi
