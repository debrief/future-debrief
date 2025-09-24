# Makefile for @debrief/web-components
# Fast verification without rebuilding

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
RED := \033[31m
RESET := \033[0m

# Source files to check
SRC_FILES := $(shell find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx")
NEWEST_SRC := $(shell ls -t $(SRC_FILES) | head -1)

# Build artifacts that should exist
DIST_FILES := dist/vanilla/index.js dist/vanilla/index.css dist/vanilla/vanilla-generated.d.ts

.PHONY: help verify verify-artifacts verify-tests verify-typecheck

help: ## Show this help message
	@echo "$(BLUE)@debrief/web-components - Fast Verification$(RESET)"
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'

verify: verify-artifacts verify-tests verify-typecheck ## Fast verification (timestamp-based)
	@echo "$(GREEN)✅ All web-components verifications passed!$(RESET)"

verify-artifacts: $(DIST_FILES) ## Verify build artifacts are up-to-date
	@echo "$(GREEN)✅ All build artifacts are up-to-date$(RESET)"

verify-tests: ## Run tests without rebuilding
	@echo "$(BLUE)🧪 Running tests...$(RESET)"
	@pnpm test && echo "$(GREEN)✅ Tests passed$(RESET)" || (echo "$(RED)❌ Tests failed$(RESET)" >&2 && exit 1)

verify-typecheck: ## Type check without compilation
	@echo "$(BLUE)🔍 Type checking...$(RESET)"
	@pnpm typecheck && echo "$(GREEN)✅ Type check passed$(RESET)" || (echo "$(RED)❌ Type check failed$(RESET)" >&2 && exit 1)

# Build artifacts must be newer than source files
$(DIST_FILES): $(NEWEST_SRC)
	@if [ ! -f "$@" ]; then \
		echo "$(RED)❌ [@debrief/web-components] Missing build artifact: $@$(RESET)"; \
		echo "$(BLUE)💡 Run: pnpm build$(RESET)"; \
		exit 1; \
	elif [ "$@" -ot "$(NEWEST_SRC)" ]; then \
		echo "$(RED)❌ [@debrief/web-components] $@ is older than source files$(RESET)"; \
		echo "$(BLUE)💡 Newest source: $(NEWEST_SRC)$(RESET)"; \
		echo "$(BLUE)💡 Run: pnpm build$(RESET)"; \
		exit 1; \
	fi
