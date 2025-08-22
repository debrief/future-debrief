#!/bin/bash
set -e

echo "Installing Debrief VS Code Extension..."

# Build locally for reliable PR review
echo "Building extension locally..."
cd /workspaces/future-debrief/vs-code
echo "Installing dependencies..."
yarn install

echo "Building extension package..."
yarn run package:vsix

if [ -f "debrief-vscode.vsix" ]; then
    echo "Installing extension..."
    code --install-extension debrief-vscode.vsix --force
    echo "Extension installed successfully! Please reload the window to activate."
    touch /workspaces/future-debrief/vs-code/workspace/installed
else
    echo "Error: VSIX file not found after build"
    touch /workspaces/future-debrief/vs-code/workspace/file-not-found
    exit 1
fi