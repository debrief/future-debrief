# Fly.io Infrastructure Setup for Debrief Extension PR Previews

This document outlines the complete Fly.io infrastructure setup for deploying code-server instances with the Debrief extension for PR previews.

## Overview

The Fly.io setup enables dynamic creation and destruction of preview environments for each pull request. Each environment is accessible at `https://pr-<pr_number>-futuredebrief.fly.dev` and provides a browser-based VS Code experience with the Debrief extension pre-installed.

## Prerequisites

1. **Fly CLI Installation**: The Fly CLI has been installed locally at `/Users/ian/.fly/bin/flyctl`
2. **Docker Compatibility**: Verified that the existing Dockerfile works correctly with Fly.io deployment requirements
3. **GitHub Actions Integration**: Requires `FLY_API_TOKEN` as a GitHub Actions Secret

## Files Created

### Core Configuration Files

1. **`fly.toml`** - Base Fly.io configuration
   - Supports the existing Docker setup from Phase 1
   - Optimized resource allocation for code-server workloads
   - Configured for stateless operation with no persistent storage
   - Auto-scaling and auto-stop capabilities for cost optimization

2. **`fly-template.toml`** - Template for dynamic PR deployments
   - Contains placeholders for PR-specific values
   - Used by CI/CD scripts to generate per-PR configurations
   - Supports the naming pattern: `pr-<pr_number>-futuredebrief`

### Helper Scripts

3. **`scripts/create-pr-app.sh`** - Creates a new Fly.io app for a PR
   - Usage: `./scripts/create-pr-app.sh <PR_NUMBER>`
   - Generates app name following the pattern: `pr-<pr_number>-futuredebrief`
   - Creates temporary fly.toml from template with proper substitutions
   - Deploys the app to Fly.io

4. **`scripts/destroy-pr-app.sh`** - Destroys a Fly.io app when PR is closed
   - Usage: `./scripts/destroy-pr-app.sh <PR_NUMBER>`
   - Safely removes the app if it exists
   - Provides feedback on operation success/failure

## Configuration Details

### Resource Allocation

The configuration is optimized for cost-effectiveness while ensuring good performance:

- **CPU**: 1 shared CPU core
- **Memory**: 1024 MB
- **Storage**: No persistent storage (stateless operation)
- **Auto-scaling**: Machines can scale down to 0 when not in use

### Networking & Security

- **Port**: Internal port 8080 (code-server default)
- **HTTPS**: Force HTTPS enabled for all connections
- **Authentication**: No password authentication (public access for ease of testing)
- **Health Checks**: Basic health checks configured on root path

### Environment Variables

- `PASSWORD=""` - No password for code-server
- `SUDO_PASSWORD=""` - No sudo password
- `DISABLE_TELEMETRY="true"` - Disable telemetry for privacy
- `TZ="UTC"` - Set timezone
- `PR_NUMBER` - Set to PR number for identification (in template)

## Deployment Process

### Manual Deployment (Testing)

1. Authenticate with Fly.io:
   ```bash
   fly auth login
   ```

2. Create and deploy a test app:
   ```bash
   ./scripts/create-pr-app.sh 123
   ```

3. Access the preview at: `https://pr-123-futuredebrief.fly.dev`

4. Clean up when done:
   ```bash
   ./scripts/destroy-pr-app.sh 123
   ```

### CI/CD Integration (Planned)

The setup is ready for GitHub Actions integration with the following workflow:

1. **On PR Open/Update**:
   - Build the Docker image with latest extension
   - Use template to generate PR-specific configuration
   - Deploy to Fly.io with naming pattern
   - Comment deployment URL on PR

2. **On PR Close**:
   - Destroy the associated Fly.io app
   - Clean up resources

## Key Design Decisions

### Naming Convention
- **Pattern**: `pr-<pr_number>-futuredebrief`
- **Domain**: `https://pr-<pr_number>-futuredebrief.fly.dev`
- **Rationale**: Clear identification and no conflicts between PRs

### Resource Optimization
- **Auto-stop**: Machines stop when idle to reduce costs
- **Shared CPU**: Cost-effective for development/testing workloads
- **1GB Memory**: Sufficient for code-server and extension operation

### Stateless Design
- **No persistence**: Each deployment starts fresh
- **Sample data included**: Pre-loaded workspace with test files
- **Extension pre-installed**: Ready-to-use environment

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure `fly auth login` has been run
   - Verify `FLY_API_TOKEN` is correctly set in CI

2. **App Creation Failures**:
   - Check if app name already exists
   - Verify organization permissions

3. **Deployment Failures**:
   - Check Docker build succeeds locally
   - Verify fly.toml syntax is correct

4. **Access Issues**:
   - Allow time for DNS propagation
   - Check Fly.io status page for outages

### Verification Commands

```bash
# List all apps
fly apps list

# Check app status
fly status --app pr-123-futuredebrief

# View logs
fly logs --app pr-123-futuredebrief

# Check machine status
fly machine list --app pr-123-futuredebrief
```

## Security Considerations

- **Public Access**: Apps are publicly accessible without authentication
- **No Secrets**: No sensitive data is stored in the environment
- **Ephemeral**: All data is lost when the app is destroyed
- **Limited Resources**: Resource limits prevent abuse

## Cost Optimization

- **Auto-stop**: Machines automatically stop when idle
- **Shared CPU**: More cost-effective than dedicated CPU
- **No storage**: No persistent volume costs
- **Auto-destroy**: Apps are destroyed when PRs close

## Next Steps

This setup provides the foundation for Phase 3 (CI/CD Integration) where GitHub Actions will automate the deployment and cleanup process using the scripts and configurations created here.