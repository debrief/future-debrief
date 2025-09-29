#!/bin/bash
set -euo pipefail

# Cleanup script for orphaned PR-related fly.io apps
# This script finds and destroys fly.io apps created for pull request previews
# that may have been left behind due to failed cleanup workflows

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# App name patterns to search for
TOOLVAULT_PATTERN="toolvault-pr-"
FUTUREDEBRIEF_PATTERN="pr-.*-futuredebrief"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if flyctl is installed and authenticated
check_flyctl() {
    if ! command -v flyctl &> /dev/null; then
        print_color $RED "❌ flyctl is not installed. Please install it first:"
        print_color $BLUE "   curl -L https://fly.io/install.sh | sh"
        exit 1
    fi

    if ! flyctl auth whoami &> /dev/null; then
        print_color $RED "❌ Not authenticated with fly.io. Please run:"
        print_color $BLUE "   flyctl auth login"
        exit 1
    fi

    local user=$(flyctl auth whoami 2>/dev/null || echo "unknown")
    print_color $GREEN "✅ Authenticated as: $user"
}

# Function to find PR-related apps
find_pr_apps() {
    # Try JSON format first, fallback to text parsing
    local all_apps=""

    # Method 1: JSON format (most reliable)
    if command -v jq &> /dev/null; then
        all_apps=$(flyctl apps list --json 2>/dev/null | jq -r '.[].Name' 2>/dev/null || echo "")
    fi

    # Method 2: Text parsing (fallback)
    if [ -z "$all_apps" ]; then
        all_apps=$(flyctl apps list 2>/dev/null | tail -n +2 | awk '{print $1}' | grep -v "^$" || echo "")
    fi

    if [ -z "$all_apps" ]; then
        print_color $YELLOW "⚠️  Unable to fetch app list. Please check your fly.io connection."
        exit 1
    fi

    # Debug: Show what apps we found (remove this later)
    # echo "DEBUG: All apps found:" >&2
    # echo "$all_apps" >&2
    # echo "---" >&2

    # Find apps matching our patterns
    local pr_apps=""

    # Look for Tool Vault pattern: toolvault-pr-{number}
    local toolvault_apps=$(echo "$all_apps" | grep "^toolvault-pr-[0-9]\+$" || true)

    # Look for VS Code pattern: pr-{number}-futuredebrief
    local futuredebrief_apps=$(echo "$all_apps" | grep "^pr-[0-9]\+-futuredebrief$" || true)

    # Debug output (remove this later)
    # echo "DEBUG: Tool Vault apps: '$toolvault_apps'" >&2
    # echo "DEBUG: FutureDebrief apps: '$futuredebrief_apps'" >&2

    # Combine results
    if [ -n "$toolvault_apps" ]; then
        pr_apps="$toolvault_apps"
    fi
    if [ -n "$futuredebrief_apps" ]; then
        if [ -n "$pr_apps" ]; then
            pr_apps="$pr_apps
$futuredebrief_apps"
        else
            pr_apps="$futuredebrief_apps"
        fi
    fi

    echo "$pr_apps"
}

# Function to display app details
show_app_details() {
    local app_name=$1
    local status=$(flyctl status --app "$app_name" --json 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")
    local url="https://${app_name}.fly.dev"

    echo "  📱 App: $app_name"
    echo "     Status: $status"
    echo "     URL: $url"
    echo ""
}

# Function to destroy apps with confirmation
destroy_apps() {
    local apps=$1
    local mode=${2:-"interactive"}

    if [ -z "$apps" ]; then
        print_color $GREEN "🎉 No PR-related apps found to cleanup!"
        return 0
    fi

    local app_count=$(echo "$apps" | wc -l | tr -d ' ')
    print_color $YELLOW "📋 Found $app_count PR-related app(s):"
    echo ""

    # Show details for each app
    while IFS= read -r app; do
        if [ -n "$app" ]; then
            show_app_details "$app"
        fi
    done <<< "$apps"

    if [ "$mode" = "interactive" ]; then
        print_color $YELLOW "⚠️  This will PERMANENTLY DELETE all the apps listed above!"
        echo ""
        read -p "Are you sure you want to destroy all these apps? (yes/no): " confirmation

        if [ "$confirmation" != "yes" ]; then
            print_color $BLUE "🚫 Operation cancelled by user."
            return 0
        fi
    fi

    print_color $BLUE "🗑️  Starting destruction of PR apps..."
    echo ""

    local success_count=0
    local fail_count=0

    while IFS= read -r app; do
        if [ -n "$app" ]; then
            print_color $BLUE "Destroying app: $app"

            if flyctl apps destroy "$app" --yes 2>/dev/null; then
                print_color $GREEN "  ✅ Successfully destroyed: $app"
                ((success_count++))
            else
                print_color $RED "  ❌ Failed to destroy: $app"
                ((fail_count++))
            fi
            echo ""
        fi
    done <<< "$apps"

    echo ""
    print_color $GREEN "📊 Cleanup Summary:"
    print_color $GREEN "  ✅ Successfully destroyed: $success_count apps"
    if [ $fail_count -gt 0 ]; then
        print_color $RED "  ❌ Failed to destroy: $fail_count apps"
    fi

    if [ $success_count -gt 0 ]; then
        print_color $GREEN "🎉 Cleanup completed! Your fly.io costs should be reduced."
    fi
}

# Function to show usage
show_usage() {
    echo "Fly.io PR Apps Cleanup Tool"
    echo "Usage: $0 [options]"
    echo ""
    echo "This script finds and destroys orphaned fly.io apps created for PR previews."
    echo "It targets apps matching these patterns:"
    echo "  • toolvault-pr-{NUMBER}"
    echo "  • pr-{NUMBER}-futuredebrief"
    echo ""
    echo "Options:"
    echo "  --list          Only list PR apps, don't destroy them (default)"
    echo "  --destroy       Destroy all PR apps immediately without confirmation"
    echo "  --interactive   Show apps and ask for confirmation before destroying"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # List orphaned apps (safe)"
    echo "  $0 --destroy    # Immediate cleanup (saves money)"
    echo "  $0 --interactive # Ask before destroying each app"
    echo ""
    echo "Safety: Production apps (main-*, toolvault-main) are never affected."
}

# Main execution
main() {
    local mode="list"  # Default to list-only mode (safe)
    local list_only=true

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --list)
                mode="list"
                list_only=true
                shift
                ;;
            --destroy)
                mode="auto"
                list_only=false
                shift
                ;;
            --interactive)
                mode="interactive"
                list_only=false
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_color $RED "❌ Unknown option: $1"
                echo ""
                show_usage
                exit 1
                ;;
        esac
    done

    if [ "$mode" = "list" ]; then
        print_color $BLUE "🔍 Fly.io PR Apps Scanner"
        print_color $BLUE "========================="
        echo ""
    else
        print_color $BLUE "🧹 Fly.io PR Apps Cleanup"
        print_color $BLUE "=========================="
        echo ""
    fi

    # Check prerequisites
    check_flyctl
    echo ""

    # Find PR apps
    print_color $BLUE "🔍 Searching for PR-related fly.io apps..."
    local pr_apps=$(find_pr_apps)

    if [ "$list_only" = true ]; then
        if [ -z "$pr_apps" ]; then
            print_color $GREEN "🎉 No PR-related apps found!"
        else
            local app_count=$(echo "$pr_apps" | wc -l | tr -d ' ')
            print_color $YELLOW "📋 Found $app_count PR-related app(s):"
            echo ""

            # Show simple list first
            print_color $BLUE "App Names:"
            while IFS= read -r app; do
                if [ -n "$app" ]; then
                    echo "  • $app"
                fi
            done <<< "$pr_apps"
            echo ""

            # Then show detailed info
            print_color $BLUE "Detailed Information:"
            while IFS= read -r app; do
                if [ -n "$app" ]; then
                    show_app_details "$app"
                fi
            done <<< "$pr_apps"
        fi
        return 0
    fi

    # Destroy apps
    destroy_apps "$pr_apps" "$mode"
}

# Run main function with all arguments
main "$@"