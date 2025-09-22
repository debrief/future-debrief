# Makefile for VS Code extension
# Fast verification without rebuilding

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
RED := \033[31m
RESET := \033[0m

# Source files to check
SRC_FILES := $(shell find src -name "*.ts" -o -name "*.tsx" 2>/dev/null)
NEWEST_SRC := $(shell ls -t $(SRC_FILES) 2>/dev/null | head -1)

# Build artifacts that should exist
DIST_FILES := dist/extension.js media/web-components.js media/web-components.css
DIST_DIRS := schemas

.PHONY: help verify verify-artifacts verify-tests verify-typecheck

help: ## Show this help message
	@echo "$(BLUE)VS Code Extension - Fast Verification$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'

verify: verify-artifacts verify-tests verify-typecheck verify-contents ## Fast verification (timestamp-based)
	@echo "$(GREEN)✅ All VS Code extension verifications passed!$(RESET)"

verify-artifacts: $(DIST_FILES) $(DIST_DIRS) ## Verify build artifacts are up-to-date
	@echo "$(GREEN)✅ All build artifacts are up-to-date$(RESET)"

verify-tests: ## Run tests without rebuilding
	@echo "$(BLUE)🧪 Running tests...$(RESET)"
	@pnpm test > /dev/null 2>&1 && echo "$(GREEN)✅ Tests passed$(RESET)" || (echo "$(RED)❌ Tests failed$(RESET)" >&2 && pnpm test && exit 1)

verify-typecheck: ## Type check without compilation
	@echo "$(BLUE)🔍 Type checking...$(RESET)"
	@pnpm typecheck > /dev/null 2>&1 && echo "$(GREEN)✅ Type check passed$(RESET)" || (echo "$(RED)❌ Type check failed$(RESET)" >&2 && pnpm typecheck && exit 1)

verify-contents: ## Verify .vsix package contents
	@echo "$(BLUE)Verifying .vsix package contents...$(RESET)"
	@VSIX_FILE=$$(find . -name "*.vsix" -type f | head -1); \
	if [ -n "$$VSIX_FILE" ]; then \
		if python -m zipfile -l "$$VSIX_FILE" | grep -q "extension/dist/extension.js" && \
		   python -m zipfile -l "$$VSIX_FILE" | grep -q "extension/schemas"; then \
			echo "$(GREEN)✅ VSIX contains extension.js and schemas$(RESET)"; \
		else \
			echo "$(RED)❌ [vs-code] VSIX missing critical files (extension.js or schemas)$(RESET)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)❌ [vs-code] No .vsix file found$(RESET)"; \
		exit 1; \
	fi

# Build artifacts must exist and be newer than source files
$(DIST_FILES): $(NEWEST_SRC)
	@if [ ! -f "$@" ]; then \
		echo "$(RED)❌ [vs-code] Missing build artifact: $@$(RESET)" >&2; \
		echo "$(BLUE)💡 Run: pnpm compile$(RESET)" >&2; \
		exit 1; \
	elif [ "$@" -ot "$(NEWEST_SRC)" ]; then \
		echo "$(RED)❌ [vs-code] $@ is older than source files$(RESET)" >&2; \
		echo "$(BLUE)💡 Newest source: $(NEWEST_SRC)$(RESET)" >&2; \
		echo "$(BLUE)💡 Run: pnpm compile$(RESET)" >&2; \
		exit 1; \
	fi

# Required directories must exist
$(DIST_DIRS):
	@if [ ! -d "$@" ]; then \
		echo "$(RED)❌ [vs-code] Missing directory: $@/$(RESET)" >&2; \
		echo "$(BLUE)💡 Run: pnpm compile$(RESET)" >&2; \
		exit 1; \
	fi