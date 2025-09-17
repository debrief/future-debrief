# Makefile for @debrief/shared-types
# Provides intelligent conditional build logic to optimize development workflow
# UPDATED: Now uses Pydantic models as single source of truth
#
# Key Performance Targets:
# - No changes: < 2 seconds (vs 10+ seconds unconditional)
# - Pydantic model changes: Full rebuild with generation + compile + test
# - Source changes: Compile + test only

# File pattern definitions - Updated for Pydantic-first approach
PYDANTIC_FILES := $(wildcard pydantic_models/**/*.py)
GENERATED_SCHEMA_FILES := $(wildcard derived/json-schema/*.json)
TS_GENERATED_FILES := $(wildcard derived/typescript/*.ts)
GENERATED_FILES := $(GENERATED_SCHEMA_FILES) $(TS_GENERATED_FILES)
COMPILED_FILES := dist/index.js dist/index.d.ts
PYTHON_WHEEL := dist/python/debrief_types-1.0.0-py3-none-any.whl

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

.PHONY: help generate-and-test build-dist build build-python-wheel clean clean-build check-status generate-ts generate-python generate-ts-internal generate-python-internal

# Default target
help: ## Show this help message
	@echo "$(BLUE)@debrief/shared-types Conditional Build System$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@sed -n 's/^##//p' $(MAKEFILE_LIST)
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Performance targets:$(RESET)"
	@echo "  • No changes: < 2 seconds (85% improvement)"
	@echo "  • Schema changes: Full rebuild (~11 seconds)"
	@echo "  • Clean build: Force complete rebuild"

## 
## Core Build Targets:
generate-and-test: $(GENERATED_FILES) test-generated ## Generate types only if schemas newer than generated files

build-dist: generate-and-test $(COMPILED_FILES) ## Build distribution only if source newer than compiled output

## 
## Individual Generation Targets:
generate-ts: $(TS_GENERATED_FILES) ## Generate TypeScript types only

generate-python: $(PY_GENERATED_FILES) ## Generate Python types only  

build: build-dist build-python-wheel ## Smart conditional build (includes Python wheel)

build-python-wheel: $(PYTHON_WHEEL) ## Build Python wheel only if generated files changed

$(PYTHON_WHEEL): $(PY_GENERATED_FILES)
	@if command -v python >/dev/null 2>&1; then \
		echo "$(BLUE)Building Python wheel...$(RESET)"; \
		mkdir -p dist/python; \
		if python -m build --wheel --outdir dist/python/ >/tmp/wheel-build.log 2>&1; then \
			echo "$(GREEN)✓ Python wheel built successfully$(RESET)"; \
		else \
			echo "$(YELLOW)⚠️ Python wheel build failed. Output:$(RESET)"; \
			cat /tmp/wheel-build.log; \
		fi; \
		rm -f /tmp/wheel-build.log \
	else \
		echo "$(YELLOW)Skipping Python wheel (Python not available)$(RESET)"; \
	fi

## 
## Maintenance Targets:
clean: ## Clean all generated files (preserves validators and hand-written code)
	@echo "$(RED)Cleaning generated files...$(RESET)"
	@# Remove generated TypeScript types (preserve validators and index.ts)
	@rm -rf src/types/
	@# Remove generated Python types and schemas (preserve validators, README.md, __init__.py)
	@rm -rf python-src/debrief/types/features/ python-src/debrief/types/states/ python-src/debrief/types/tools/
	@rm -rf python-src/debrief/schemas/
	@find python-src/debrief/types/ -maxdepth 1 -name "*.py" ! -name "__init__.py" ! -name "README.md" -delete 2>/dev/null || true
	@# Remove build artifacts
	@rm -rf dist/* build/ *.egg-info/

clean-build: clean build ## Force complete rebuild after cleaning

check-status: ## Show detailed build status and what would be rebuilt
	@echo "$(BLUE)=== Build Status Analysis ===$(RESET)"
	@echo ""
	@echo "$(GREEN)Schema Files ($(words $(SCHEMA_FILES)) found):$(RESET)"
	@for schema in $(SCHEMA_FILES); do \
		if [ -f "$$schema" ]; then \
			printf "  ✓ $$schema (modified: %s)\n" "$$(date -r "$$schema" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')"; \
		else \
			printf "  ✗ $$schema (missing)\n"; \
		fi \
	done
	@echo ""
	@echo "$(GREEN)Generated Files Status:$(RESET)"
	@missing_generated=0; \
	for gen_file in $(GENERATED_FILES); do \
		if [ -f "$$gen_file" ]; then \
			printf "  ✓ $$gen_file (modified: %s)\n" "$$(date -r "$$gen_file" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')"; \
		else \
			printf "  ✗ $$gen_file (missing)\n"; \
			missing_generated=$$((missing_generated + 1)); \
		fi \
	done; \
	echo ""; \
	if [ $$missing_generated -gt 0 ]; then \
		echo "$(YELLOW)⚠️  $$missing_generated generated files missing - will regenerate$(RESET)"; \
	fi
	@echo ""
	@echo "$(GREEN)Compiled Files Status:$(RESET)"
	@missing_compiled=0; \
	for comp_file in $(COMPILED_FILES); do \
		if [ -f "$$comp_file" ]; then \
			printf "  ✓ $$comp_file (modified: %s)\n" "$$(date -r "$$comp_file" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'unknown')"; \
		else \
			printf "  ✗ $$comp_file (missing)\n"; \
			missing_compiled=$$((missing_compiled + 1)); \
		fi \
	done; \
	echo ""; \
	if [ $$missing_compiled -gt 0 ]; then \
		echo "$(YELLOW)⚠️  $$missing_compiled compiled files missing - will recompile$(RESET)"; \
	fi
	@echo ""
	@echo "$(BLUE)=== Conditional Build Plan ===$(RESET)"
	@if $(MAKE) -q generate-and-test 2>/dev/null; then \
		echo "  1. $(GREEN)✓ Skip generation$(RESET) - generated files up to date"; \
	else \
		echo "  1. $(YELLOW)🔄 Will regenerate types$(RESET) - schemas newer than generated files"; \
	fi
	@if $(MAKE) -q build-dist 2>/dev/null; then \
		echo "  2. $(GREEN)✓ Skip compilation$(RESET) - compiled files up to date"; \
	else \
		echo "  2. $(YELLOW)🔄 Will recompile$(RESET) - source newer than compiled output"; \
	fi

# Rule 1: Generate types if any Pydantic model is newer than any generated file
$(GENERATED_FILES): $(PYDANTIC_FILES) generate_from_pydantic.py
	@echo "$(YELLOW)📝 Pydantic model changes detected - regenerating all types...$(RESET)"
	@# Create lockfile to prevent recursive builds
	@if [ -f ".generation-lock" ]; then \
		echo "$(RED)Generation already in progress, skipping...$(RESET)"; \
		exit 0; \
	fi
	@touch .generation-lock
	@$(MAKE) generate-from-pydantic-internal || (rm -f .generation-lock && exit 1)
	@rm -f .generation-lock
	@echo "$(GREEN)✓ Type generation complete$(RESET)"

# Pydantic-based generation rules
generate-from-pydantic-internal:
	@echo "$(BLUE)Generating JSON Schema and TypeScript from Pydantic models...$(RESET)"
	@python3 generate_from_pydantic.py
	@echo "$(GREEN)✓ Pydantic generation complete$(RESET)"

# Legacy TypeScript generation rules (deprecated)
generate-ts-internal:
	@echo "$(BLUE)Generating TypeScript types...$(RESET)"
	@# Clean generated directories (preserve validators and index.ts)
	@rm -rf src/types/ 2>/dev/null || true
	@NODE_NO_WARNINGS=1 mkdir -p src/types/features src/types/states src/types/tools
	@# Generate TypeScript types in parallel by category
	@for category in features states tools; do \
		for schema in schemas/$$category/*.json; do \
			basename=$$(basename "$$schema" .schema.json); \
			output="src/types/$$category/$$(echo "$$basename" | tr '[:upper:]' '[:lower:]').ts"; \
			NODE_NO_WARNINGS=1 npx json-schema-to-typescript "$$schema" --cwd "schemas/$$category/" > "$$output" & \
		done; \
	done; \
	wait

# Python generation rules
generate-python-internal:
	@echo "$(BLUE)Generating Python types...$(RESET)"
	@# Clean generated directories (preserve hand-written files)
	@rm -rf python-src/debrief/schemas/ 2>/dev/null || true
	@rm -rf python-src/debrief/types/features/ python-src/debrief/types/states/ python-src/debrief/types/tools/ 2>/dev/null || true
	@find python-src/debrief/types/ -maxdepth 1 -name "*.py" ! -name "__init__.py" ! -name "README.md" -delete 2>/dev/null || true
	@# Create directory structure
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/types/features python-src/debrief/types/states python-src/debrief/types/tools
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/schemas/features python-src/debrief/schemas/states python-src/debrief/schemas/tools
	@echo "$(BLUE)Copying schemas to Python package with folder structure...$(RESET)"
	@# Copy schemas with organized structure
	@for category in features states tools; do \
		cp schemas/$$category/*.json python-src/debrief/schemas/$$category/ 2>/dev/null || true; \
	done
	@# Generate Python types using datamodel-codegen, adding Schema alias for cross-references
	@for mapping in $(PYTHON_CLASS_MAPPING); do \
		schema="$${mapping%:*}"; \
		class_name="$${mapping##*:}"; \
		category="$$(echo $$schema | cut -d'/' -f2)"; \
		basename="$$(basename "$$schema" .schema.json)"; \
		temp_file="/tmp/datamodel_$${category}_$${basename}.py"; \
		temp_dir="/tmp/datamodel_$${category}_$${basename}_dir"; \
		output_file="python-src/debrief/types/$$category/$$basename.py"; \
		echo "Processing $$schema -> $$output_file"; \
		rm -rf "$$temp_dir" "$$temp_file"; \
		if datamodel-codegen --input "$$schema" --output "$$temp_file" --target-python-version 3.9 \
			--class-name "$$class_name" --use-schema-description --use-field-description \
			--output-model-type pydantic_v2.BaseModel --disable-appending-item-suffix \
			--input-file-type jsonschema 2>/dev/null; then \
			cp "$$temp_file" "$$output_file"; \
			echo "# Alias for cross-reference compatibility" >> "$$output_file"; \
			echo "Schema = $$class_name" >> "$$output_file"; \
			if command -v gsed >/dev/null 2>&1; then \
				gsed -i 's/, discriminator=.*properties\/dataType.*//' "$$output_file"; \
			else \
				sed -i.bak 's/, discriminator=.*properties\/dataType.*//' "$$output_file" && rm -f "$${output_file}.bak"; \
			fi; \
			if [ "$$category" != "features" ]; then \
				python3 fix_imports.py "$$output_file"; \
			fi; \
			rm -f "$$temp_file"; \
			echo "Successfully generated $$schema using single-file mode"; \
		else \
			echo "Retrying with directory output for $$schema (has modular references)"; \
			mkdir -p "$$temp_dir"; \
			if datamodel-codegen --input "$$schema" --output "$$temp_dir" --target-python-version 3.9 \
				--class-name "$$class_name" --use-schema-description --use-field-description \
				--output-model-type pydantic_v2.BaseModel --disable-appending-item-suffix \
				--input-file-type jsonschema; then \
				if [ -f "$$temp_dir/__init__.py" ]; then \
					cp "$$temp_dir/__init__.py" "$$output_file"; \
					if command -v gsed >/dev/null 2>&1; then \
						gsed -i 's/, discriminator=.*properties\/dataType.*//' "$$output_file"; \
					else \
						sed -i.bak 's/, discriminator=.*properties\/dataType.*//' "$$output_file" && rm -f "$${output_file}.bak"; \
					fi; \
					if [ "$$category" != "features" ]; then \
						if command -v gsed >/dev/null 2>&1; then \
							gsed -i 's/from \. import \([^,]*Annotation[^,]*\)/from ..features import \1/g' "$$output_file"; \
							gsed -i 's/from \. import \([^,]*Point[^,]*\)/from ..features import \1/g' "$$output_file"; \
							gsed -i 's/from \. import \([^,]*Track[^,]*\)/from ..features import \1/g' "$$output_file"; \
							gsed -i 's/from \. import \([^,]*FeatureCollection[^,]*\)/from ..features import \1/g' "$$output_file"; \
						else \
							sed -i.bak 's/from \. import \([^,]*Annotation[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
							sed -i.bak 's/from \. import \([^,]*Point[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
							sed -i.bak 's/from \. import \([^,]*Track[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
							sed -i.bak 's/from \. import \([^,]*FeatureCollection[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
						fi; \
					fi; \
					echo "Successfully generated $$schema using directory mode (from __init__.py)"; \
				else \
					generated_file=$$(find "$$temp_dir" -name "*.py" | head -1); \
					if [ -f "$$generated_file" ]; then \
						cp "$$generated_file" "$$output_file"; \
						if command -v gsed >/dev/null 2>&1; then \
							gsed -i 's/, discriminator=.*properties\/dataType.*//' "$$output_file"; \
						else \
							sed -i.bak 's/, discriminator=.*properties\/dataType.*//' "$$output_file" && rm -f "$${output_file}.bak"; \
						fi; \
						if [ "$$category" != "features" ]; then \
							if command -v gsed >/dev/null 2>&1; then \
								gsed -i 's/from \. import \([^,]*Annotation[^,]*\)/from ..features import \1/g' "$$output_file"; \
								gsed -i 's/from \. import \([^,]*Point[^,]*\)/from ..features import \1/g' "$$output_file"; \
								gsed -i 's/from \. import \([^,]*Track[^,]*\)/from ..features import \1/g' "$$output_file"; \
								gsed -i 's/from \. import \([^,]*FeatureCollection[^,]*\)/from ..features import \1/g' "$$output_file"; \
							else \
								sed -i.bak 's/from \. import \([^,]*Annotation[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
								sed -i.bak 's/from \. import \([^,]*Point[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
								sed -i.bak 's/from \. import \([^,]*Track[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
								sed -i.bak 's/from \. import \([^,]*FeatureCollection[^,]*\)/from ..features import \1/g' "$$output_file" && rm -f "$${output_file}.bak"; \
							fi; \
						fi; \
						echo "Successfully generated $$schema using directory mode (from $$generated_file)"; \
					else \
						echo "ERROR: No Python files found in $$temp_dir"; \
					fi; \
				fi; \
			else \
				echo "ERROR: Failed to generate $$schema even with directory output"; \
			fi; \
			rm -rf "$$temp_dir"; \
		fi; \
	done
	@# Create organized __init__.py with dynamic imports from PYTHON_CLASS_MAPPING
	@printf '"""\nGenerated Python types for Debrief maritime GeoJSON features and application state.\nThese types are generated from JSON schemas and provide type hints and validation.\n"""\n\n# Import from organized subpackages\n' > python-src/debrief/types/__init__.py
	@# Generate imports dynamically from PYTHON_CLASS_MAPPING
	@for mapping in $(PYTHON_CLASS_MAPPING); do \
		schema="$${mapping%:*}"; \
		class_name="$${mapping##*:}"; \
		category="$$(echo $$schema | cut -d'/' -f2)"; \
		basename="$$(basename "$$schema" .schema.json)"; \
		printf "from .%s.%s import %s\n" "$$category" "$$basename" "$$class_name" >> python-src/debrief/types/__init__.py; \
	done
	@# Generate __all__ list dynamically
	@printf '\n__all__ = [' >> python-src/debrief/types/__init__.py
	@first=true; for mapping in $(PYTHON_CLASS_MAPPING); do \
		class_name="$${mapping##*:}"; \
		if [ "$$first" = true ]; then \
			printf '"%s"' "$$class_name" >> python-src/debrief/types/__init__.py; \
			first=false; \
		else \
			printf ', "%s"' "$$class_name" >> python-src/debrief/types/__init__.py; \
		fi; \
	done
	@printf ']\n' >> python-src/debrief/types/__init__.py
	@# Create __init__.py files for subfolders
	@printf '' > python-src/debrief/types/features/__init__.py
	@printf '' > python-src/debrief/types/states/__init__.py
	@printf '' > python-src/debrief/types/tools/__init__.py
	@# Add Schema aliases to any files that are missing them
	@echo "$(BLUE)Adding Schema aliases to generated files...$(RESET)"
	@python3 add_schema_alias.py python-src/debrief/types
	@# Fix complex import issues in files using directory mode generation
	@echo "$(BLUE)Fixing import paths in complex generated files...$(RESET)"
	@for file in python-src/debrief/types/states/EditorState.py python-src/debrief/types/states/CurrentState.py; do \
		if [ -f "$$file" ]; then \
			python3 fix_imports.py "$$file"; \
		fi; \
	done
	@# Fix complex import and Schema reference issues using Python script
	@echo "$(BLUE)Fixing generated import and Schema reference issues...$(RESET)"
	@python3 fix_generated_imports.py python-src/debrief/types

# Rule 2: Compile distribution if any generated file is newer than compiled output
$(COMPILED_FILES): $(GENERATED_FILES)
	@echo "$(YELLOW)🔨 Source changes detected - recompiling distribution...$(RESET)"
	@mkdir -p dist
	@npx tsc
	@echo "$(GREEN)✓ Compilation complete$(RESET)"

# Test generated files (runs after generation)
test-generated:
	@echo "$(BLUE)🧪 Testing generated files...$(RESET)"
	@node tests/typescript/test-generated-files.js >/dev/null 2>&1 || (echo "$(RED)✗ TypeScript tests failed$(RESET)" && node tests/typescript/test-generated-files.js && exit 1)
	@if command -v python3 >/dev/null 2>&1; then \
		echo "$(BLUE)Installing Python dependencies for testing...$(RESET)"; \
		python3 -m pip install "python-dateutil>=2.8.0" >/dev/null 2>&1 || echo "$(YELLOW)⚠️ Could not install python-dateutil, tests may fail$(RESET)"; \
		python3 tests/python/test_generated_files.py >/dev/null 2>&1 || (echo "$(RED)✗ Python tests failed$(RESET)" && python3 tests/python/test_generated_files.py && exit 1); \
	else \
		echo "$(YELLOW)Skipping Python tests (Python not available)$(RESET)"; \
	fi
	@echo "$(GREEN)✓ Generated file tests passed$(RESET)"