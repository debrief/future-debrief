# Tool Vault Packager CI/CD Pipeline

This directory contains the CI/CD pipeline for the Tool Vault Packager component.

## Overview

The pipeline follows the monorepo pattern established in `apps/vs-code/CI/` and provides a complete build, test, and deployment workflow for the Tool Vault packager.

## Pipeline Stages

1. **Build SPA** - Builds the Single Page Application using `npm run build:spa`
2. **Package PYZ** - Creates the .pyz file using the packager.py script
3. **Test PYZ** - Validates the .pyz file exists and is executable
4. **Publish Artifact** - Uploads the .pyz file to GitHub Actions artifacts
5. **Deploy to Fly.io** - Deploys the packaged application to Fly.io using Docker

## Composite Actions

### build-spa
Builds the Tool Vault SPA using npm.

### package-pyz
Packages the application into a .pyz file using the existing packager.py script.

### test-pyz
Tests that the .pyz file is correctly generated and executable.

### publish-artifact
Uploads the .pyz file and metadata to GitHub Actions artifacts.

### deploy-fly
Deploys the packaged application to Fly.io with Docker containerization.

### main-pipeline
Orchestrates the complete pipeline execution in the correct sequence.

## Triggers

The pipeline is triggered by changes to files in the `libs/tool-vault-packager/` directory via the root-level GitHub workflow.

## Configuration

### Environment Variables Required
- `FLY_API_TOKEN` - Fly.io API token for deployment

### Optional Inputs
- `artifact_retention_days` - Days to retain artifacts (default: 30)
- `skip_deployment` - Skip Fly.io deployment (default: false)
- `is_pr` - Whether this is a PR deployment (default: false)
- `pr_number` - PR number for PR deployments

## Usage

The pipeline is automatically triggered when files in `libs/tool-vault-packager/` are modified. It can also be manually triggered via workflow_dispatch.

## Fly.io Deployment

The Fly.io deployment:
- Creates or uses an existing Fly.io app
- Builds and deploys using Docker containerization
- Supports both production and PR preview deployments
- Production: `https://toolvault-main.fly.dev`
- PR previews: `https://toolvault-pr-{number}.fly.dev`
- FastAPI server runs on port 5000 with health check endpoints
- Provides the deployment URL in the pipeline output