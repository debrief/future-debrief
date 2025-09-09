# Tool Vault Packager CI/CD Pipeline

This directory contains the CI/CD pipeline for the Tool Vault Packager component.

## Overview

The pipeline follows the monorepo pattern established in `apps/vs-code/CI/` and provides a complete build, test, and deployment workflow for the Tool Vault packager.

## Pipeline Stages

1. **Build SPA** - Builds the Single Page Application using `npm run build:spa`
2. **Package PYZ** - Creates the .pyz file using the packager.py script
3. **Test PYZ** - Validates the .pyz file exists and is executable
4. **Publish Artifact** - Uploads the .pyz file to GitHub Actions artifacts
5. **Deploy to Heroku** - Deploys the packaged application to Heroku

## Composite Actions

### build-spa
Builds the Tool Vault SPA using npm.

### package-pyz
Packages the application into a .pyz file using the existing packager.py script.

### test-pyz
Tests that the .pyz file is correctly generated and executable.

### publish-artifact
Uploads the .pyz file and metadata to GitHub Actions artifacts.

### deploy-heroku
Deploys the packaged application to Heroku with proper configuration.

### main-pipeline
Orchestrates the complete pipeline execution in the correct sequence.

## Triggers

The pipeline is triggered by changes to files in the `libs/tool-vault-packager/` directory via the root-level GitHub workflow.

## Configuration

### Environment Variables Required
- `HEROKU_API_KEY` - Heroku API key for deployment

### Optional Inputs
- `heroku_app_name` - Name of the Heroku app (default: 'toolvault-server')
- `artifact_retention_days` - Days to retain artifacts (default: 30)
- `skip_deployment` - Skip Heroku deployment (default: false)

## Usage

The pipeline is automatically triggered when files in `libs/tool-vault-packager/` are modified. It can also be manually triggered via workflow_dispatch.

## Heroku Deployment

The Heroku deployment:
- Creates or uses an existing Heroku app
- Deploys the .pyz file with proper Python runtime configuration
- Starts the server with `python toolvault.pyz serve --port $PORT --host 0.0.0.0`
- Provides the deployment URL in the pipeline output