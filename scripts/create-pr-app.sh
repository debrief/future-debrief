#!/bin/bash

# Script to create a Fly.io app for PR previews
# Usage: ./scripts/create-pr-app.sh <PR_NUMBER>

set -e

# Check if PR number is provided
if [ $# -eq 0 ]; then
    echo "Error: PR number is required"
    echo "Usage: $0 <PR_NUMBER>"
    exit 1
fi

PR_NUMBER=$1
APP_NAME="pr-${PR_NUMBER}-futuredebrief"

echo "Creating Fly.io app for PR #${PR_NUMBER}"
echo "App name: ${APP_NAME}"
echo "URL: https://${APP_NAME}.fly.dev"

# Create temporary fly.toml from template
TEMP_FLY_TOML=$(mktemp)
sed "s/PR_APP_NAME_PLACEHOLDER/${APP_NAME}/g; s/PR_NUMBER_PLACEHOLDER/${PR_NUMBER}/g" fly-template.toml > "$TEMP_FLY_TOML"

# Create the app (this would be run in CI with proper authentication)
echo "Creating app ${APP_NAME}..."
fly apps create "$APP_NAME" --org personal

# Deploy using the temporary fly.toml
echo "Deploying app ${APP_NAME}..."
fly deploy --config "$TEMP_FLY_TOML" --app "$APP_NAME"

# Clean up temporary file
rm "$TEMP_FLY_TOML"

echo "✅ PR preview deployed successfully!"
echo "🌐 Access your preview at: https://${APP_NAME}.fly.dev"
echo "📋 App name: ${APP_NAME}"