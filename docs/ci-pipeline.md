# CI/CD Pipeline Documentation

## Overview

This repository uses GitHub Actions to automatically create preview environments for pull requests using Fly.io deployments.

## Workflows

### 1. PR Preview Deployment (`pr-preview.yml`)

**Triggers:** Pull request opened, updated, or reopened against `main` branch

**Process:**
1. **Build Phase** (~1 minute)
   - Checkout PR branch
   - Install Node.js dependencies
   - Compile TypeScript to JavaScript
   - Package extension as `.vsix` file using `vsce`

2. **Deploy Phase** (~2 minutes)
   - Setup Fly.io CLI
   - Generate unique app name: `pr-{NUMBER}-futuredebrief`
   - Create/update Fly.io app configuration
   - Deploy Docker container with code-server + extension
   - Wait for deployment completion (max 5 minutes)

3. **Notification Phase**
   - Post comment on PR with preview URL
   - Include access instructions and app details
   - Update existing comments on subsequent pushes

**Output:** Accessible preview at `https://pr-{NUMBER}-futuredebrief.fly.dev`

### 2. PR Cleanup (`pr-cleanup.yml`)

**Triggers:** Pull request closed (merged or abandoned)

**Process:**
1. Identify associated Fly.io app
2. Destroy the preview app to free resources
3. Post confirmation comment on PR

### 3. Build Validation (`ci.yml`)

**Triggers:** All pushes and pull requests

**Process:**
1. Basic build verification
2. Extension packaging test
3. Docker build context validation

## Required Secrets

### `FLY_API_TOKEN`
- **Location:** Repository Settings → Secrets and Variables → Actions
- **Purpose:** Authenticate with Fly.io for deployments
- **Generation:** `fly auth token` command after `fly auth login`

## Performance Targets

- **Total deployment time:** < 3 minutes
- **Docker image size:** < 1 GB
- **Build success rate:** > 95%

## Troubleshooting

### Common Issues

1. **Extension build failures**
   - Check TypeScript compilation errors
   - Verify all dependencies are installed
   - Ensure `package.json` scripts are correct

2. **Fly.io deployment timeouts**
   - Check Docker build process
   - Verify Fly.io API token is valid
   - Monitor resource limits

3. **Preview not accessible**
   - Wait 30-60 seconds after deployment
   - Check Fly.io app status: `fly status --app pr-{NUMBER}-futuredebrief`
   - Verify port 8080 is exposed correctly

### Manual Operations

**Create preview manually:**
```bash
./scripts/create-pr-app.sh 123
```

**Destroy preview manually:**
```bash
./scripts/destroy-pr-app.sh 123
```

**Check app status:**
```bash
fly status --app pr-123-futuredebrief
```

## Security Considerations

- Only PRs from the same repository trigger deployments (prevents fork attacks)
- Preview environments have no persistent storage
- No sensitive data is included in preview deployments
- Apps are automatically destroyed when PRs are closed

## Architecture

```
GitHub PR → Actions → Build Extension → Docker Image → Fly.io → Preview URL
     ↓                                                              ↓
   Comment ← GitHub API ← Deployment Success ← Fly.io Deploy ← Container
```

## Cost Optimization

- **Concurrency:** One deployment per PR (cancels previous builds)
- **Auto-scaling:** Apps sleep when not in use (`auto_stop_machines`)
- **Resource limits:** 1 CPU, 1GB RAM per preview
- **Cleanup:** Automatic destruction on PR close