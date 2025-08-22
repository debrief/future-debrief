#!/bin/bash
set -e

echo "Installing Debrief VS Code Extension..."

# Get the current commit SHA
COMMIT_SHA=$(git rev-parse HEAD)
REPO="debrief/future-debrief"

# Function to download artifact using GitHub API
download_artifact() {
    local run_id=$1
    echo "Attempting to download artifact from run $run_id..."
    
    # Download the artifact zip
    curl -H "Accept: application/vnd.github+json" \
         -H "X-GitHub-Api-Version: 2022-11-28" \
         -L "https://api.github.com/repos/$REPO/actions/runs/$run_id/artifacts" \
         -o artifacts.json
    
    # Get the download URL for the debrief-vscode-vsix artifact
    DOWNLOAD_URL=$(cat artifacts.json | grep -A 10 "debrief-vscode-vsix" | grep "archive_download_url" | cut -d'"' -f4 | head -1)
    
    if [ ! -z "$DOWNLOAD_URL" ]; then
        echo "Found artifact, downloading..."
        curl -L "$DOWNLOAD_URL" -o extension.zip
        unzip -q extension.zip
        if [ -f "debrief-vscode.vsix" ]; then
            echo "Installing extension..."
            code --install-extension debrief-vscode.vsix
            echo "Extension installed successfully! Please reload the window to activate."
            return 0
        fi
    fi
    return 1
}

# Try to find a recent successful workflow run for this commit or branch
echo "Looking for recent build artifact..."

# Get workflow runs for the current branch
BRANCH=$(git branch --show-current)
curl -H "Accept: application/vnd.github+json" \
     -H "X-GitHub-Api-Version: 2022-11-28" \
     "https://api.github.com/repos/$REPO/actions/workflows/build-vsix.yml/runs?branch=$BRANCH&status=completed&per_page=5" \
     -o runs.json

# Try the most recent successful runs
RUN_IDS=$(cat runs.json | grep '"id":' | cut -d':' -f2 | cut -d',' -f1 | head -3)

for run_id in $RUN_IDS; do
    run_id=$(echo $run_id | tr -d ' ')
    if download_artifact "$run_id"; then
        exit 0
    fi
done

# Fallback: build locally if no artifact found
echo "No recent artifact found, building extension locally..."
cd /workspaces/future-debrief/vs-code
yarn install
yarn run package:vsix
code --install-extension debrief-vscode.vsix
echo "Extension built and installed locally! Please reload the window to activate."