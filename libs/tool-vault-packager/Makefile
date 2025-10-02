# Makefile for tool-vault-packager
# Fast verification without rebuilding

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
RED := \033[31m
RESET := \033[0m

# Source files to check
PYTHON_FILES := $(shell find . -name "*.py" \
  -not -path "./shared-types/*" \
  -not -path "./spa/node_modules/*" \
  -not -path "./node_modules/*" \
  -not -path "./tmp_package_contents/*" \
  -not -path "./tools/*" \
  -not -path "./test/*")
SPA_FILES := $(shell find spa/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx")
NEWEST_PYTHON := $(shell ls -t $(PYTHON_FILES) | head -1)
NEWEST_SPA := $(shell ls -t $(SPA_FILES) | head -1)

# Build artifacts that should exist
REQUIRED_FILES := dist/toolvault.pyz shared-types/python-src shared-types/src spa/dist/index.html
REQUIRED_DIRS := spa/node_modules node_modules

.PHONY: help verify verify-artifacts verify-tests verify-typecheck lint lint-fix type-check check-all install-dev-deps

help: ## Show this help message
	@echo "$(BLUE)tool-vault-packager - Fast Verification$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'

verify: verify-static-analysis verify-artifacts verify-tests ## Fast verification (timestamp-based)
	@echo "$(GREEN)✅ All tool-vault-packager verifications passed!$(RESET)"

verify-static-analysis: ## Run static analysis as part of verification (blocking)
	@echo "$(BLUE)🔍 Running static analysis...$(RESET)"
	@if command -v ruff >/dev/null 2>&1 && command -v mypy >/dev/null 2>&1; then \
		echo "$(BLUE)📦 Static analysis tools available, running checks...$(RESET)"; \
		$(MAKE) --no-print-directory check-all || { echo "$(RED)❌ Static analysis checks failed$(RESET)" >&2; exit 1; }; \
	else \
		echo "$(BLUE)📦 Static analysis tools not installed (optional in gradual cleanup mode)$(RESET)"; \
		echo "$(BLUE)💡 To install: make install-dev-deps$(RESET)"; \
	fi

# Static Analysis Targets
install-dev-deps: ## Install development dependencies including static analysis tools
	@echo "$(BLUE)📦 Installing development dependencies...$(RESET)"
	@pip install -r requirements-dev.txt && echo "$(GREEN)✅ Development dependencies installed$(RESET)" || (echo "$(RED)❌ Failed to install development dependencies$(RESET)" && exit 1)

lint: ## Run ruff linting (blocking)
	@echo "$(BLUE)🔍 Running ruff linting...$(RESET)"
	@ruff check . && echo "$(GREEN)✅ Linting passed$(RESET)" || (echo "$(RED)❌ Linting issues found$(RESET)" >&2 && exit 1)

lint-fix: ## Run ruff linting with auto-fix and formatting
	@echo "$(BLUE)🔧 Running ruff with auto-fix and formatting...$(RESET)"
	@ruff check . --fix && ruff format . && echo "$(GREEN)✅ Code formatted and fixed$(RESET)" || (echo "$(RED)❌ Some issues couldn't be auto-fixed$(RESET)" && true)

type-check: ## Run mypy type checking
	@echo "$(BLUE)🔍 Running mypy type checking...$(RESET)"
	@TMP=$$(mktemp); \
	if mypy $(PYTHON_FILES) >$$TMP 2>&1; then \
		rm -f $$TMP; \
		echo "$(GREEN)✅ Type checking passed$(RESET)"; \
	else \
		cat $$TMP >&2; \
		rm -f $$TMP; \
		echo "$(RED)❌ Type checking failed$(RESET)" >&2; \
		exit 1; \
	fi

check-all: lint type-check ## Run all static analysis checks
	@echo "$(GREEN)✅ All static analysis checks completed$(RESET)"

verify-artifacts: $(REQUIRED_FILES) $(REQUIRED_DIRS) ## Verify build artifacts are up-to-date
	@echo "$(GREEN)✅ All build artifacts are up-to-date$(RESET)"

verify-tests: ## Run basic validation tests
	@echo "$(BLUE)🧪 Running basic tests...$(RESET)"
	@npm test && echo "$(GREEN)✅ Tests passed$(RESET)" || (echo "$(RED)❌ Tests failed$(RESET)" && exit 1)

# Check required files exist and are up-to-date
spa/dist/index.html: $(SPA_FILES)
dist/toolvault.pyz: $(PYTHON_FILES) $(SPA_FILES)
shared-types/python-src:

$(REQUIRED_FILES):
	@if [ ! -f "$@" ]; then \
		echo "$(RED)❌ [tool-vault-packager] Missing build artifact: $@$(RESET)" >&2; \
		echo "❌ [tool-vault-packager] Missing build artifact: $@"; \
		if [[ "$@" == *".pyz" ]]; then \
			echo "$(BLUE)💡 Run: npm run build$(RESET)" >&2; \
			echo "💡 Run: npm run build"; \
		elif [[ "$@" == *"shared-types"* ]]; then \
			echo "$(BLUE)💡 Run: cd ../shared-types && make build$(RESET)" >&2; \
			echo "💡 Run: cd ../shared-types && make build"; \
		elif [[ "$@" == *"spa/dist"* ]]; then \
			echo "$(BLUE)💡 Run: npm run build:spa$(RESET)" >&2; \
			echo "💡 Run: npm run build:spa"; \
		fi; \
		exit 1; \
	elif [[ "$@" == *"spa/dist"* ]] && [[ -n "$(NEWEST_SPA)" ]] && [[ "$@" -ot "$(NEWEST_SPA)" ]]; then \
		echo "$(RED)❌ [tool-vault-packager] $@ is older than SPA source files$(RESET)" >&2; \
		echo "❌ [tool-vault-packager] $@ is older than SPA source files"; \
		echo "$(BLUE)💡 Newest source: $(NEWEST_SPA)$(RESET)" >&2; \
		echo "💡 Newest source: $(NEWEST_SPA)"; \
		echo "$(BLUE)🔧 Attempting to rebuild SPA...$(RESET)" >&2; \
		echo "🔧 Attempting to rebuild SPA..."; \
		npm run build:spa || (echo "$(RED)❌ SPA build failed$(RESET)" >&2 && echo "❌ SPA build failed" && exit 1); \
	elif [[ "$@" == *".pyz" ]] && [[ -n "$(NEWEST_PYTHON)" ]] && [[ "$@" -ot "$(NEWEST_PYTHON)" ]]; then \
		echo "$(RED)❌ [tool-vault-packager] $@ is older than Python source files$(RESET)" >&2; \
		echo "❌ [tool-vault-packager] $@ is older than Python source files"; \
		echo "$(BLUE)💡 Newest source: $(NEWEST_PYTHON)$(RESET)" >&2; \
		echo "💡 Newest source: $(NEWEST_PYTHON)"; \
		echo "$(BLUE)🔧 Attempting to rebuild package...$(RESET)" >&2; \
		echo "🔧 Attempting to rebuild package..."; \
		npm run build || (echo "$(RED)❌ Package build failed$(RESET)" >&2 && echo "❌ Package build failed" && exit 1); \
	elif [[ "$@" == *".pyz" ]] && [[ -n "$(NEWEST_SPA)" ]] && [[ "$@" -ot "$(NEWEST_SPA)" ]]; then \
		echo "$(RED)❌ [tool-vault-packager] $@ is older than SPA source files$(RESET)" >&2; \
		echo "❌ [tool-vault-packager] $@ is older than SPA source files"; \
		echo "$(BLUE)💡 Newest source: $(NEWEST_SPA)$(RESET)" >&2; \
		echo "💡 Newest source: $(NEWEST_SPA)"; \
		echo "$(BLUE)🔧 Attempting to rebuild package...$(RESET)" >&2; \
		echo "🔧 Attempting to rebuild package..."; \
		npm run build || (echo "$(RED)❌ Package build failed$(RESET)" >&2 && echo "❌ Package build failed" && exit 1); \
	fi

# Check required directories exist
$(REQUIRED_DIRS):
	@if [ ! -d "$@" ]; then \
		echo "$(RED)❌ [tool-vault-packager] Missing directory: $@/$(RESET)"; \
		if [[ "$@" == *"spa/node_modules" ]]; then \
			echo "$(BLUE)💡 Run: cd spa && npm install$(RESET)"; \
		else \
			echo "$(BLUE)💡 Run: npm install$(RESET)"; \
		fi; \
		exit 1; \
	fi
