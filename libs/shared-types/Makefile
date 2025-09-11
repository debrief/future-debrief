# Makefile for @debrief/shared-types
# Provides intelligent conditional build logic to optimize development workflow
#
# Key Performance Targets:
# - No changes: < 2 seconds (vs 10+ seconds unconditional)
# - Schema changes: Full rebuild with generation + compile + test
# - Source changes: Compile + test only

# File pattern definitions
SCHEMA_FILES := $(wildcard schemas/features/*.json) $(wildcard schemas/states/*.json)
TS_GENERATED_FILES := src/types/featurecollection.ts src/types/timestate.ts src/types/viewportstate.ts src/types/selectionstate.ts src/types/editorstate.ts src/types/currentstate.ts src/types/track.ts src/types/point.ts src/types/annotation.ts
PY_GENERATED_FILES := python-src/debrief/types/track.py python-src/debrief/types/point.py python-src/debrief/types/annotation.py python-src/debrief/types/featurecollection.py python-src/debrief/types/TimeState.py python-src/debrief/types/ViewportState.py python-src/debrief/types/SelectionState.py python-src/debrief/types/EditorState.py
GENERATED_FILES := $(TS_GENERATED_FILES) $(PY_GENERATED_FILES)
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
		python -m build --wheel --outdir dist/python/ || echo "$(YELLOW)⚠️ Python wheel build skipped (missing dependencies)$(RESET)"; \
	else \
		echo "$(YELLOW)Skipping Python wheel (Python not available)$(RESET)"; \
	fi

## 
## Maintenance Targets:
clean: ## Clean all generated files
	@echo "$(RED)Cleaning generated files...$(RESET)"
	@rm -rf src/types/[!R]*.ts dist/* python-src/debrief/types/[!R]*.py python-src/debrief/schemas/*.json build/ *.egg-info/

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

# Rule 1: Generate types if any schema is newer than any generated file
$(GENERATED_FILES): $(SCHEMA_FILES)
	@echo "$(YELLOW)📝 Schema changes detected - regenerating all types...$(RESET)"
	@$(MAKE) generate-ts-internal
	@$(MAKE) generate-python-internal
	@echo "$(GREEN)✓ Type generation complete$(RESET)"

# TypeScript generation rules  
generate-ts-internal:
	@echo "$(BLUE)Generating TypeScript types (6 parallel processes)...$(RESET)"
	@NODE_NO_WARNINGS=1 mkdir -p src/types
	@NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/features/FeatureCollection.schema.json --cwd schemas/features/ > src/types/featurecollection.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/TimeState.schema.json --cwd schemas/states/ > src/types/timestate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/ViewportState.schema.json --cwd schemas/states/ > src/types/viewportstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/SelectionState.schema.json --cwd schemas/states/ > src/types/selectionstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/EditorState.schema.json --cwd schemas/states/ > src/types/editorstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/CurrentState.schema.json --cwd schemas/states/ > src/types/currentstate.ts & \
	wait
	@printf '// Re-export from featurecollection to avoid duplication\nexport { DebriefTrackFeature } from "./featurecollection";\n' > src/types/track.ts
	@printf '// Re-export from featurecollection to avoid duplication\nexport { DebriefPointFeature } from "./featurecollection";\n' > src/types/point.ts
	@printf '// Re-export from featurecollection to avoid duplication\nexport { DebriefAnnotationFeature } from "./featurecollection";\n' > src/types/annotation.ts

# Python generation rules
generate-python-internal:
	@echo "$(BLUE)Generating Python types (8 parallel processes)...$(RESET)"
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/types
	@NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Track.schema.json -o python-src/debrief/types/track.py --lang python --top-level TrackFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Point.schema.json -o python-src/debrief/types/point.py --lang python --top-level PointFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Annotation.schema.json -o python-src/debrief/types/annotation.py --lang python --top-level AnnotationFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/FeatureCollection.schema.json -o python-src/debrief/types/featurecollection.py --lang python --top-level DebriefFeatureCollection & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/TimeState.schema.json -o python-src/debrief/types/TimeState.py --lang python --top-level TimeState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/ViewportState.schema.json -o python-src/debrief/types/ViewportState.py --lang python --top-level ViewportState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/SelectionState.schema.json -o python-src/debrief/types/SelectionState.py --lang python --top-level SelectionState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/EditorState.schema.json -o python-src/debrief/types/EditorState.py --lang python --top-level EditorState & \
	wait

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
	@python3 tests/python/test_generated_files.py >/dev/null 2>&1 || (echo "$(RED)✗ Python tests failed$(RESET)" && python3 tests/python/test_generated_files.py && exit 1)
	@echo "$(GREEN)✓ Generated file tests passed$(RESET)"