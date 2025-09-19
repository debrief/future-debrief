#!/bin/bash

# Fast Pre-Push Validation Script
# Uses Makefile verify targets for timestamp-based checking

set -e  # Exit on first error for fast feedback

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Performance tracking
START_TIME=$(date +%s)

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate a package using its Makefile verify target
validate_package() {
    local package_dir=$1
    local package_name=$2

    log_info "🔍 Validating $package_name..."

    cd "$package_dir"

    # Capture both stdout and stderr from make verify
    local make_output
    if ! make_output=$(make verify 2>&1); then
        {
            echo ""
            echo "================================================"
            echo -e "${RED}🚨 PUSH BLOCKED: $package_name validation failed${NC}"
            echo "================================================"
            echo ""
            echo "🔍 Specific failure details:"
            echo "$make_output"
            echo ""
            echo "🔧 To fix this issue, run:"
            if [[ "$package_name" == "shared-types" ]]; then
                echo "   cd $package_dir && make generate"
            else
                echo "   cd $package_dir && pnpm build"
            fi
            echo ""
            echo "Then commit any generated changes and try pushing again."
            echo "================================================"
        } >&2
        return 1
    fi

    cd - > /dev/null
    log_success "✅ $package_name validation completed"
    return 0
}

# Main validation function
main() {
    log_info "🚀 Starting fast pre-push validation..."
    echo "Target: Verify all packages without rebuilding"
    echo ""

    # Validate all packages with Makefile verify targets
    local packages=(
        "libs/shared-types:shared-types"
        "libs/web-components:web-components"
        "apps/vs-code:vs-code"
    )

    for package_info in "${packages[@]}"; do
        IFS=':' read -r package_dir package_name <<< "$package_info"

        if ! validate_package "$package_dir" "$package_name"; then
            exit 1
        fi
    done

    # Performance summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))

    echo ""
    log_success "🎉 All validations passed!"
    echo ""
    echo "📊 Performance Summary:"
    echo "   Total: ${total_duration}s"

    if [[ $total_duration -gt 10 ]]; then
        log_error "⚠️  Validation took longer than 10s target (${total_duration}s)"
        echo "This suggests build artifacts may be out of date"
    else
        log_success "🚀 Fast validation completed within 10s target (${total_duration}s)"
    fi

    echo ""
    log_success "✅ Ready to push! All checks passed."
}

# Handle script interruption
trap 'log_error "Validation interrupted"; exit 1' INT

# Run main validation
main "$@"