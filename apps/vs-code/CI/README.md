# VS Code Extension CI Actions

This directory contains the GitHub Actions **composite actions** for the VS Code extension, called by trigger workflows in the repository root.

## Why CI instead of .github?

These composite actions are stored in the `CI/action/` directory instead of `.github/workflows/` because:

1. **Monorepo Structure**: The extension is now part of a larger monorepo
2. **Clean Separation**: Keeps extension-specific CI logic isolated from the main project
3. **Composite Actions**: Uses modern GitHub Actions composite action pattern for reusability
4. **Trigger Pattern**: Root-level trigger workflows in `/.github/workflows/` call these actions when changes are detected in the `apps/vs-code/` directory

## Composite Actions

- `action/build-extension/` - Reusable action for building the VS Code extension
- `action/pr-preview/` - Creates preview deployments for pull requests
- `action/main-deploy/` - Deploys to production on main branch
- `action/pr-cleanup/` - Cleans up preview environments when PRs are closed

## How They're Triggered

These composite actions are called by corresponding trigger workflows in the repository root:
- `/.github/workflows/vs-pr-preview.yml` → `CI/action/pr-preview`
- `/.github/workflows/vs-main-deploy.yml` → `CI/action/main-deploy`
- `/.github/workflows/vs-pr-cleanup.yml` → `CI/action/pr-cleanup`

The trigger workflows:
1. Monitor changes in the `apps/vs-code/` directory
2. Use GitHub's `uses:` syntax to call these composite actions
3. Pass required inputs and secrets to the actions

This approach uses modern GitHub Actions patterns while keeping the CI logic close to the code and maintaining clean separation in the monorepo.