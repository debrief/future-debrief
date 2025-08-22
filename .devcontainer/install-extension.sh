#!/bin/bash
echo "Building and installing extension..."
npx @vscode/vsce package
if [ -f "codespace-extension-0.0.1.vsix" ]; then
    code --install-extension codespace-extension-0.0.1.vsix --force
    echo "Extension installed successfully"
    touch install-complete
else
    echo "VSIX file not found"
    exit 1
fi