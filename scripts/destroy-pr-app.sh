#!/bin/bash

# Script to destroy a Fly.io app for PR previews
# Usage: ./scripts/destroy-pr-app.sh <PR_NUMBER>

set -e

# Check if PR number is provided
if [ $# -eq 0 ]; then
    echo "Error: PR number is required"
    echo "Usage: $0 <PR_NUMBER>"
    exit 1
fi

PR_NUMBER=$1
APP_NAME="pr-${PR_NUMBER}-futuredebrief"

echo "Destroying Fly.io app for PR #${PR_NUMBER}"
echo "App name: ${APP_NAME}"

# Check if app exists first
if fly apps list | grep -q "$APP_NAME"; then
    echo "Destroying app ${APP_NAME}..."
    fly apps destroy "$APP_NAME" --yes
    echo "✅ App ${APP_NAME} destroyed successfully!"
else
    echo "⚠️  App ${APP_NAME} not found or already destroyed"
fi