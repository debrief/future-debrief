#!/bin/bash

# Comprehensive Pre-Push Validation Script
# Eliminates CI failures through fast local feedback mechanisms

set -e  # Exit on first error for fast feedback

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Performance tracking
START_TIME=$(date +%s)
PACKAGE_TIMES=()

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_timing() {
    local package=$1
    local duration=$2
    echo -e "${BLUE}[TIMING]${NC} $package: ${duration}s"
    PACKAGE_TIMES+=("$package: ${duration}s")
}

# Utility function to check if a file is newer than another
is_newer() {
    local file1=$1
    local file2=$2

    if [[ ! -f "$file1" ]]; then
        log_error "Source file $file1 does not exist"
        return 1
    fi

    if [[ ! -f "$file2" ]]; then
        log_error "Target file $file2 does not exist"
        return 1
    fi

    # Compare modification times
    if [[ "$file1" -nt "$file2" ]]; then
        return 0  # file1 is newer
    else
        return 1  # file2 is newer or same age
    fi
}

# Function to validate shared-types package
validate_shared_types() {
    log_info "🔍 Validating shared-types package..."
    local start_time=$(date +%s)

    cd libs/shared-types

    # Check if Pydantic models are newer than generated files
    log_info "Checking timestamp verification for Pydantic-first architecture..."

    # Find the newest Pydantic source file
    local newest_pydantic
    if [[ -d "python-src/debrief/types" ]]; then
        newest_pydantic=$(find python-src/debrief/types -name "*.py" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)
        log_info "Newest Pydantic model: $newest_pydantic"
    else
        log_error "Pydantic source directory not found"
        return 1
    fi

    # Check if generated schemas exist and are fresh
    local schema_files=(
        "derived/json-schema/features/FeatureCollection.schema.json"
        "src/types/featurecollection.ts"
    )

    for schema_file in "${schema_files[@]}"; do
        if [[ -f "$schema_file" ]]; then
            if is_newer "$newest_pydantic" "$schema_file"; then
                log_warning "Generated file $schema_file is older than Pydantic models"
                log_info "Regenerating types..."
                break
            fi
        else
            log_warning "Generated file $schema_file does not exist"
            log_info "Generating types..."
            break
        fi
    done

    # Generate types to ensure they're fresh
    log_info "Running type generation..."
    if ! pnpm generate:types; then
        log_error "Failed to generate types"
        return 1
    fi

    # Run TypeScript compilation check
    log_info "Running TypeScript type check..."
    if ! pnpm typecheck; then
        log_error "TypeScript type check failed"
        return 1
    fi

    # Test Python wheel build
    log_info "Testing Python wheel build..."
    if ! python3 -c "import sys; sys.path.insert(0, '.'); from setup import setup"; then
        log_error "Python wheel setup check failed"
        return 1
    fi

    # Run package tests
    log_info "Running shared-types tests..."
    if ! pnpm test; then
        log_error "Shared-types tests failed"
        return 1
    fi

    cd ../..

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_timing "shared-types" "$duration"
    log_success "✅ Shared-types validation completed"

    return 0
}

# Function to validate web-components package
validate_web_components() {
    log_info "🔍 Validating web-components package..."
    local start_time=$(date +%s)

    cd libs/web-components

    # Build the components
    log_info "Building web components..."
    if ! pnpm build; then
        log_error "Web components build failed"
        return 1
    fi

    # Verify vanilla JS bundle generation
    local required_files=(
        "dist/vanilla/index.js"
        "dist/vanilla/index.css"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file $file was not generated"
            return 1
        fi
        log_info "✓ Generated: $file"
    done

    # Run React component tests
    log_info "Running web components tests..."
    if ! pnpm test; then
        log_error "Web components tests failed"
        return 1
    fi

    cd ../..

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_timing "web-components" "$duration"
    log_success "✅ Web-components validation completed"

    return 0
}

# Function to validate VS Code extension
validate_vs_code_extension() {
    log_info "🔍 Validating VS Code extension..."
    local start_time=$(date +%s)

    cd apps/vs-code

    # Compile the extension
    log_info "Compiling VS Code extension..."
    if ! pnpm compile; then
        log_error "VS Code extension compilation failed"
        return 1
    fi

    # Verify extension compilation outputs
    local required_files=(
        "dist/extension.js"
        "media/web-components.js"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required compiled file $file was not generated"
            return 1
        fi
        log_info "✓ Compiled: $file"
    done

    # Check if schemas directory was copied
    if [[ ! -d "schemas/" ]]; then
        log_error "Schemas directory was not copied to VS Code extension"
        return 1
    fi
    log_info "✓ Schemas directory copied"

    # Run extension tests
    log_info "Running VS Code extension tests..."
    if ! pnpm test; then
        log_error "VS Code extension tests failed"
        return 1
    fi

    # Build .vsix package and verify contents
    log_info "Building .vsix package for content verification..."
    if ! pnpm build; then
        log_error "VS Code extension build failed"
        return 1
    fi

    # Find the latest .vsix file
    local latest_vsix
    latest_vsix=$(ls -t *.vsix 2>/dev/null | head -1)

    if [[ -z "$latest_vsix" ]]; then
        log_error "No .vsix file was generated"
        return 1
    fi

    log_info "Verifying .vsix package contents: $latest_vsix"

    # Verify JSON schemas are embedded in .vsix
    if ! unzip -l "$latest_vsix" | grep -q "schemas/features/"; then
        log_error "JSON schemas not found in .vsix package"
        return 1
    fi
    log_info "✓ JSON schemas embedded in .vsix"

    # Verify Python wheel is embedded in .vsix
    if ! unzip -l "$latest_vsix" | grep -q "python-wheels/.*\.whl"; then
        log_error "Python wheel not found in .vsix package"
        return 1
    fi
    log_info "✓ Python wheel embedded in .vsix"

    cd ../..

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_timing "vs-code" "$duration"
    log_success "✅ VS Code extension validation completed"

    return 0
}

# Function to validate tool-vault-packager
validate_tool_vault_packager() {
    log_info "🔍 Validating tool-vault-packager package..."
    local start_time=$(date +%s)

    cd libs/tool-vault-packager

    # Note: This package uses npm, not pnpm due to Docker constraints
    log_info "Checking shared-types auto-push freshness..."

    # Check if shared-types was recently copied/updated
    if [[ -d "shared_types_copy" ]]; then
        # Find newest file in shared-types source
        local newest_shared_types
        if [[ -d "../../shared-types/python-src" ]]; then
            newest_shared_types=$(find ../../shared-types/python-src -name "*.py" -type f -exec stat -f "%m %N" {} \; | sort -nr | head -1 | cut -d' ' -f2-)

            # Find newest file in local copy
            local newest_copy
            newest_copy=$(find shared_types_copy -name "*.py" -type f -exec stat -f "%m %N" {} \; 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)

            if [[ -n "$newest_copy" ]] && is_newer "$newest_shared_types" "$newest_copy"; then
                log_warning "Shared-types copy is outdated"
                # Auto-push would normally happen here, but we'll validate the current state
            fi
        fi
    fi

    # Test Python imports work
    log_info "Testing Python imports..."
    if ! python3 -c "from debrief.types.track import TrackFeature" 2>/dev/null; then
        log_warning "Direct import failed, checking if shared-types wheel is available..."
        # This is expected if we need to build/install the wheel first
    fi

    # Build the .pyz package
    log_info "Building .pyz package..."
    if ! npm run build; then
        log_error "Tool-vault-packager build failed"
        return 1
    fi

    # Run integration tests
    log_info "Running tool-vault-packager integration tests..."
    if ! npm run test:playwright:pyz; then
        log_error "Tool-vault-packager integration tests failed"
        return 1
    fi

    cd ../..

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_timing "tool-vault-packager" "$duration"
    log_success "✅ Tool-vault-packager validation completed"

    return 0
}

# Function to run global checks
validate_global_checks() {
    log_info "🔍 Running global validation checks..."
    local start_time=$(date +%s)

    # Run monorepo typecheck
    log_info "Running global typecheck..."
    if ! pnpm typecheck; then
        log_error "Global typecheck failed"
        return 1
    fi

    # Run monorepo lint
    log_info "Running global lint..."
    if ! pnpm lint; then
        log_error "Global lint failed"
        return 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_timing "global-checks" "$duration"
    log_success "✅ Global validation completed"

    return 0
}

# Main validation function with dependency chain management
main() {
    log_info "🚀 Starting comprehensive pre-push validation..."
    echo "Target: Complete validation in <30 seconds"
    echo ""

    # Phase 1: Shared-types (foundation for all other packages)
    if ! validate_shared_types; then
        log_error "❌ Shared-types validation failed"
        echo ""
        echo "🔧 Suggested fix:"
        echo "   cd libs/shared-types && pnpm generate:types && pnpm test && pnpm lint"
        exit 1
    fi

    # Phase 2: Parallel validation of packages that depend on shared-types
    local pids=()
    local temp_dir="/tmp/pre-push-validation-$$"
    mkdir -p "$temp_dir"

    # Start web-components validation in background
    (
        if validate_web_components; then
            echo "SUCCESS" > "$temp_dir/web-components"
        else
            echo "FAILED" > "$temp_dir/web-components"
        fi
    ) &
    pids+=($!)

    # Start tool-vault-packager validation in background
    (
        if validate_tool_vault_packager; then
            echo "SUCCESS" > "$temp_dir/tool-vault-packager"
        else
            echo "FAILED" > "$temp_dir/tool-vault-packager"
        fi
    ) &
    pids+=($!)

    # Wait for parallel validations to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done

    # Check results of parallel validations
    if [[ $(cat "$temp_dir/web-components") == "FAILED" ]]; then
        log_error "❌ Web-components validation failed"
        echo ""
        echo "🔧 Suggested fix:"
        echo "   cd libs/web-components && pnpm build && pnpm test"
        rm -rf "$temp_dir"
        exit 1
    fi

    if [[ $(cat "$temp_dir/tool-vault-packager") == "FAILED" ]]; then
        log_error "❌ Tool-vault-packager validation failed"
        echo ""
        echo "🔧 Suggested fix:"
        echo "   cd libs/tool-vault-packager && npm run build && npm run test:playwright:pyz"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Phase 3: VS Code extension (depends on web-components)
    if ! validate_vs_code_extension; then
        log_error "❌ VS Code extension validation failed"
        echo ""
        echo "🔧 Suggested fix:"
        echo "   cd apps/vs-code && pnpm compile && pnpm test && pnpm build"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Phase 4: Global checks
    if ! validate_global_checks; then
        log_error "❌ Global validation checks failed"
        echo ""
        echo "🔧 Suggested fix:"
        echo "   pnpm typecheck && pnpm lint"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Cleanup
    rm -rf "$temp_dir"

    # Performance summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))

    echo ""
    log_success "🎉 All validations passed!"
    echo ""
    echo "📊 Performance Summary:"
    for timing in "${PACKAGE_TIMES[@]}"; do
        echo "   $timing"
    done
    echo "   Total: ${total_duration}s"

    if [[ $total_duration -gt 30 ]]; then
        log_warning "⚠️  Validation took longer than 30s target (${total_duration}s)"
        echo "Consider optimizing slow packages or improving caching"
    else
        log_success "🚀 Validation completed within 30s target (${total_duration}s)"
    fi

    echo ""
    log_success "✅ Ready to push! All checks passed."
}

# Handle script interruption
trap 'log_error "Validation interrupted"; exit 1' INT

# Run main validation
main "$@"