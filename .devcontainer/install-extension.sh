#!/bin/bash
set -e

touch /workspaces/future-debrief/vs-code/workspace/install-started

echo "Installing Debrief VS Code Extension..."

# Build locally for reliable PR review
echo "Building extension locally..."
cd /workspaces/future-debrief/vs-code

touch /workspaces/future-debrief/vs-code/workspace/about-to-install

echo "Installing dependencies..."
yarn install
touch /workspaces/future-debrief/vs-code/workspace/install-complete

echo "Building extension package..."
yarn run package:vsix
touch /workspaces/future-debrief/vs-code/workspace/package=built

if [ -f "debrief-vscode.vsix" ]; then
    echo "Installing extension..."
    touch /workspaces/future-debrief/vs-code/workspace/file-found
    code --install-extension debrief-vscode.vsix --force
    echo "Extension installed successfully! Please reload the window to activate."
    touch /workspaces/future-debrief/vs-code/workspace/installed
else
    echo "Error: VSIX file not found after build"
    touch /workspaces/future-debrief/vs-code/workspace/file-not-found
    exit 1
fi