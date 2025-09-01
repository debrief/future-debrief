# VS Code Extension CI Workflows

This directory contains the GitHub Actions workflows for the VS Code extension, but they are **not directly executed by GitHub**.

## Why CI instead of .github?

These workflows are stored in the `CI/` directory instead of `.github/workflows/` because:

1. **Monorepo Structure**: The extension is now part of a larger monorepo
2. **Clean PRs**: Keeps extension-specific workflows isolated from the main project
3. **Manual Trigger**: Root-level trigger workflows in `/.github/workflows/` call these workflows when changes are detected in the `apps/vs-code/` directory

## Workflow Files

- `build-extension.yml` - Reusable workflow for building the VS Code extension
- `pr-preview.yml` - Creates preview deployments for pull requests
- `main-deploy.yml` - Deploys to production on main branch
- `pr-cleanup.yml` - Cleans up preview environments when PRs are closed

## How They're Triggered

These workflows are called by corresponding trigger workflows in the repository root:
- `/.github/workflows/vs-pr-preview.yml` → `CI/workflows/pr-preview.yml`
- `/.github/workflows/vs-main-deploy.yml` → `CI/workflows/main-deploy.yml`
- `/.github/workflows/vs-pr-cleanup.yml` → `CI/workflows/pr-cleanup.yml`


The trigger workflows:
1. Monitor changes in the `apps/vs-code/` directory
2. Use GitHub's `uses:` syntax to call these CI workflows
3. Set appropriate working directories and context

This approach keeps the CI logic close to the code while maintaining clean separation in the monorepo.