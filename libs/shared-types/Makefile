# Makefile for @debrief/shared-types
# Provides intelligent conditional build logic to optimize development workflow
#
# Key Performance Targets:
# - No changes: < 2 seconds (vs 10+ seconds unconditional)
# - Schema changes: Full rebuild with generation + compile + test
# - Source changes: Compile + test only

# File pattern definitions
SCHEMA_FILES := $(wildcard schemas/features/*.json) $(wildcard schemas/states/*.json) $(wildcard schemas/tools/*.json)
TS_GENERATED_FILES := src/types/features/featurecollection.ts src/types/features/track.ts src/types/features/point.ts src/types/features/annotation.ts src/types/states/timestate.ts src/types/states/viewportstate.ts src/types/states/selectionstate.ts src/types/states/editorstate.ts src/types/states/currentstate.ts src/types/tools/tool.ts src/types/tools/toollistresponse.ts src/types/tools/toolcallrequest.ts src/types/tools/toolcallresponse.ts src/types/tools/jsonschema.ts src/types/tools/constrainedfeature.ts src/types/tools/input.ts src/types/tools/output.ts
PY_GENERATED_FILES := python-src/debrief/types/features/track.py python-src/debrief/types/features/point.py python-src/debrief/types/features/annotation.py python-src/debrief/types/features/featurecollection.py python-src/debrief/types/states/TimeState.py python-src/debrief/types/states/ViewportState.py python-src/debrief/types/states/SelectionState.py python-src/debrief/types/states/EditorState.py python-src/debrief/types/tools/Tool.py python-src/debrief/types/tools/ToolListResponse.py python-src/debrief/types/tools/ToolCallRequest.py python-src/debrief/types/tools/ToolCallResponse.py python-src/debrief/types/tools/JSONSchema.py python-src/debrief/types/tools/ConstrainedFeature.py python-src/debrief/types/tools/Input.py python-src/debrief/types/tools/Output.py
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
clean: ## Clean all generated files
	@echo "$(RED)Cleaning generated files...$(RESET)"
	@rm -rf src/types/[!R]*.ts dist/* python-src/debrief/types/[!R]*.py python-src/debrief/types/features/ python-src/debrief/types/states/ python-src/debrief/types/tools/ python-src/debrief/schemas/features/ python-src/debrief/schemas/states/ python-src/debrief/schemas/tools/ build/ *.egg-info/

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
	@echo "$(BLUE)Generating TypeScript types (17 parallel processes)...$(RESET)"
	@NODE_NO_WARNINGS=1 mkdir -p src/types/features
	@NODE_NO_WARNINGS=1 mkdir -p src/types/states
	@NODE_NO_WARNINGS=1 mkdir -p src/types/tools
	@# Remove old flat type files (except index.ts)
	@find src/types/ -maxdepth 1 -name "*.ts" -not -name "index.ts" -delete 2>/dev/null || true
	@NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/features/FeatureCollection.schema.json --cwd schemas/features/ > src/types/features/featurecollection.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/features/Track.schema.json --cwd schemas/features/ > src/types/features/track.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/features/Point.schema.json --cwd schemas/features/ > src/types/features/point.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/features/Annotation.schema.json --cwd schemas/features/ > src/types/features/annotation.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/TimeState.schema.json --cwd schemas/states/ > src/types/states/timestate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/ViewportState.schema.json --cwd schemas/states/ > src/types/states/viewportstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/SelectionState.schema.json --cwd schemas/states/ > src/types/states/selectionstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/EditorState.schema.json --cwd schemas/states/ > src/types/states/editorstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/states/CurrentState.schema.json --cwd schemas/states/ > src/types/states/currentstate.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/Tool.schema.json --cwd schemas/tools/ > src/types/tools/tool.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/ToolListResponse.schema.json --cwd schemas/tools/ > src/types/tools/toollistresponse.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/ToolCallRequest.schema.json --cwd schemas/tools/ > src/types/tools/toolcallrequest.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/ToolCallResponse.schema.json --cwd schemas/tools/ > src/types/tools/toolcallresponse.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/JSONSchema.schema.json --cwd schemas/tools/ > src/types/tools/jsonschema.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/ConstrainedFeature.schema.json --cwd schemas/tools/ > src/types/tools/constrainedfeature.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/Input.schema.json --cwd schemas/tools/ > src/types/tools/input.ts & \
	NODE_NO_WARNINGS=1 npx json-schema-to-typescript schemas/tools/Output.schema.json --cwd schemas/tools/ > src/types/tools/output.ts & \
	wait

# Python generation rules
generate-python-internal:
	@echo "$(BLUE)Generating Python types (16 parallel processes)...$(RESET)"
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/types/features
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/types/states
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/types/tools
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/schemas/features
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/schemas/states
	@NODE_NO_WARNINGS=1 mkdir -p python-src/debrief/schemas/tools
	@echo "$(BLUE)Copying schemas to Python package with folder structure...$(RESET)"
	@# Remove old flat schema files (except __init__.py)
	@find python-src/debrief/schemas/ -maxdepth 1 -name "*.json" -delete 2>/dev/null || true
	@# Remove old flat type files (except __init__.py and README.md)
	@find python-src/debrief/types/ -maxdepth 1 -name "*.py" ! -name "__init__.py" -delete 2>/dev/null || true
	@# Preserve organized __init__.py if it exists, otherwise create template
	@if [ ! -f python-src/debrief/types/__init__.py ]; then \
		printf '"""Generated Python types for Debrief maritime GeoJSON features and application state."""\n\n# Import from organized subpackages\nfrom .features.annotation import AnnotationFeature\nfrom .features.featurecollection import DebriefFeatureCollection\nfrom .features.track import TrackFeature\nfrom .features.point import PointFeature\nfrom .states.EditorState import EditorState\nfrom .states.TimeState import TimeState\nfrom .states.ViewportState import ViewportState\nfrom .states.SelectionState import SelectionState\nfrom .tools.Tool import Tool\nfrom .tools.ToolCallRequest import ToolCallRequest\nfrom .tools.ToolListResponse import ToolListResponse\nfrom .tools.JSONSchema import JSONSchema\n\n__all__ = ["AnnotationFeature", "DebriefFeatureCollection", "TrackFeature", "PointFeature", "EditorState", "TimeState", "ViewportState", "SelectionState", "Tool", "ToolCallRequest", "ToolListResponse", "JSONSchema"]\n' > python-src/debrief/types/__init__.py; \
	fi
	@# Copy schemas with organized structure
	@cp schemas/features/*.json python-src/debrief/schemas/features/ 2>/dev/null || true
	@cp schemas/states/*.json python-src/debrief/schemas/states/ 2>/dev/null || true
	@cp schemas/tools/*.json python-src/debrief/schemas/tools/ 2>/dev/null || true
	@# Generate organized Python types
	@NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Track.schema.json -o python-src/debrief/types/features/track.py --lang python --top-level TrackFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Point.schema.json -o python-src/debrief/types/features/point.py --lang python --top-level PointFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/Annotation.schema.json -o python-src/debrief/types/features/annotation.py --lang python --top-level AnnotationFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/features/FeatureCollection.schema.json -o python-src/debrief/types/features/featurecollection.py --lang python --top-level DebriefFeatureCollection & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/TimeState.schema.json -o python-src/debrief/types/states/TimeState.py --lang python --top-level TimeState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/ViewportState.schema.json -o python-src/debrief/types/states/ViewportState.py --lang python --top-level ViewportState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/SelectionState.schema.json -o python-src/debrief/types/states/SelectionState.py --lang python --top-level SelectionState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/states/EditorState.schema.json -o python-src/debrief/types/states/EditorState.py --lang python --top-level EditorState & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/Tool.schema.json -o python-src/debrief/types/tools/Tool.py --lang python --top-level Tool & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/ToolListResponse.schema.json -o python-src/debrief/types/tools/ToolListResponse.py --lang python --top-level ToolListResponse & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/ToolCallRequest.schema.json -o python-src/debrief/types/tools/ToolCallRequest.py --lang python --top-level ToolCallRequest & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/ToolCallResponse.schema.json -o python-src/debrief/types/tools/ToolCallResponse.py --lang python --top-level ToolCallResponse & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/JSONSchema.schema.json -o python-src/debrief/types/tools/JSONSchema.py --lang python --top-level JsonSchema & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/ConstrainedFeature.schema.json -o python-src/debrief/types/tools/ConstrainedFeature.py --lang python --top-level ConstrainedFeature & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/Input.schema.json -o python-src/debrief/types/tools/Input.py --lang python --top-level Input & \
	NODE_NO_WARNINGS=1 quicktype -s schema schemas/tools/Output.schema.json -o python-src/debrief/types/tools/Output.py --lang python --top-level Output & \
	wait
	@# Create __init__.py files for subfolders
	@printf '' > python-src/debrief/types/features/__init__.py
	@printf '' > python-src/debrief/types/states/__init__.py
	@printf '' > python-src/debrief/types/tools/__init__.py

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