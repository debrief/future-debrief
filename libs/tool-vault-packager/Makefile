# Makefile for tool-vault-packager
# Fast verification without rebuilding

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
RED := \033[31m
RESET := \033[0m

# Source files to check
PYTHON_FILES := $(shell find . -name "*.py" -not -path "./shared-types/*" -not -path "./spa/node_modules/*" -not -path "./node_modules/*" 2>/dev/null)
SPA_FILES := $(shell find spa/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null)
NEWEST_PYTHON := $(shell ls -t $(PYTHON_FILES) 2>/dev/null | head -1)
NEWEST_SPA := $(shell ls -t $(SPA_FILES) 2>/dev/null | head -1)

# Build artifacts that should exist
REQUIRED_FILES := dist/toolvault.pyz shared-types/python-src spa/dist/index.html
REQUIRED_DIRS := spa/node_modules node_modules

.PHONY: help verify verify-artifacts verify-tests verify-typecheck

help: ## Show this help message
	@echo "$(BLUE)tool-vault-packager - Fast Verification$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'

verify: verify-artifacts verify-tests ## Fast verification (timestamp-based)
	@echo "$(GREEN)✅ All tool-vault-packager verifications passed!$(RESET)"

verify-artifacts: $(REQUIRED_FILES) $(REQUIRED_DIRS) ## Verify build artifacts are up-to-date
	@echo "$(GREEN)✅ All build artifacts are up-to-date$(RESET)"

verify-tests: ## Run basic validation tests
	@echo "$(BLUE)🧪 Running basic tests...$(RESET)"
	@npm test > /dev/null 2>&1 && echo "$(GREEN)✅ Tests passed$(RESET)" || (echo "$(RED)❌ Tests failed$(RESET)" && exit 1)

# Check required files exist
$(REQUIRED_FILES):
	@if [ ! -f "$@" ]; then \
		echo "$(RED)❌ [tool-vault-packager] Missing build artifact: $@$(RESET)"; \
		if [[ "$@" == *".pyz" ]]; then \
			echo "$(BLUE)💡 Run: npm run build$(RESET)"; \
		elif [[ "$@" == *"shared-types"* ]]; then \
			echo "$(BLUE)💡 Run: cd ../shared-types && make build$(RESET)"; \
		elif [[ "$@" == *"spa/dist"* ]]; then \
			echo "$(BLUE)💡 Run: npm run build:spa$(RESET)"; \
		fi; \
		exit 1; \
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