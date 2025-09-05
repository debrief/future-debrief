# Web Components CI Actions

This directory contains GitHub Actions for the `@debrief/web-components` package.

## Actions

### `chromatic`

Runs Chromatic visual testing for the web components Storybook.

**Features:**
- Builds Storybook and uploads to Chromatic for visual testing
- Posts PR comments with visual diff links
- Handles build failures with helpful error messages
- Optimized for monorepo with proper dependency management

**Inputs:**
- `project_token` (required): Chromatic project token
- `pr_number` (optional): Pull request number for comment posting
- `pr_sha` (optional): Pull request SHA for build identification

**Usage in workflows:**
```yaml
- name: Run Web Components Chromatic
  uses: ./libs/web-components/CI/action/chromatic
  with:
    project_token: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    pr_number: ${{ github.event.number }}
    pr_sha: ${{ github.event.pull_request.head.sha }}
```

## Architecture

This follows the same encapsulation pattern as the VS Code extension CI:

- **Root trigger**: `.github/workflows/chromatic.yml` - Minimal trigger file
- **Action logic**: `libs/web-components/CI/action/chromatic/` - All web-components specific logic
- **Encapsulation**: Knowledge of web-components build process stays within the package

This ensures that:
1. Web-components CI logic is co-located with the package code
2. Root workflows remain simple and declarative  
3. Package maintainers can modify CI without touching root workflows
4. Changes to web-components CI are tracked with the package changes