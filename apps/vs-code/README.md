# Codespace Extension

A demonstration project showing how to create a VS Code extension that can be previewed in GitHub Codespaces directly from Pull Requests.

## Features

This extension demonstrates three core VS Code extension capabilities:

- **Command Palette Integration**: Execute "Hello World" command via Command Palette (`Ctrl+Shift+P`)
- **Activation Notification**: Displays welcome message when extension activates
- **Custom View Panel**: Shows Hello World content in Explorer sidebar

## Development Setup

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/codespace-extension.git
   cd codespace-extension
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Compile TypeScript:
   ```bash
   yarn compile
   ```

4. Launch Extension Development Host:
   - Press `F5` in VS Code
   - Or run "Debug: Start Debugging" from Command Palette

### GitHub Codespaces Development

1. **From Repository**: Click "Code" → "Create codespace on main"
2. **From PR**: Use the Codespace link automatically added to PR comments
3. Dependencies install automatically via devcontainer configuration

## Testing the Extension

Once the Extension Development Host launches:

1. **Test Command Palette**:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type "Hello World" and execute the command
   - Verify information message appears

2. **Check Activation Notification**:
   - Should appear automatically when extension activates
   - Look for "Codespace Extension has been activated successfully!"

3. **View Custom Panel**:
   - Open Explorer sidebar if not already open
   - Look for "Hello World" section
   - Should display extension status messages

## Project Structure

```
codespace-extension/
├── .devcontainer/
│   └── devcontainer.json          # Codespace configuration
├── .github/
│   └── workflows/
│       └── codespace-preview.yml  # PR preview automation
├── docs/
│   ├── implementation-plan.md     # Development roadmap
│   └── software-requirements.md   # Requirements specification
├── src/
│   └── extension.ts               # Main extension code
├── out/                           # Compiled JavaScript (generated)
├── package.json                   # Extension manifest
└── tsconfig.json                 # TypeScript configuration
```

## PR Preview Workflow

When you create a Pull Request:

1. **GitHub Actions triggers** automatically on PR creation/updates
2. **Workflow validates** extension compiles successfully  
3. **Comment is added** to PR with Codespace preview link
4. **Team members can test** changes directly in Codespace

### Creating a Test PR

1. Create a feature branch:
   ```bash
   git checkout -b feature/test-changes
   ```

2. Make changes to the extension (e.g., modify messages in `src/extension.ts`)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test extension changes"
   git push origin feature/test-changes
   ```

4. Create PR via GitHub UI or CLI:
   ```bash
   gh pr create --title "Test Extension Changes" --body "Testing PR preview workflow"
   ```

5. Check PR comments for Codespace preview link

## Build Commands

- `yarn compile` - Compile TypeScript to JavaScript
- `yarn watch` - Watch mode compilation for development
- `yarn vscode:prepublish` - Prepare for publishing (runs compile)

## Troubleshooting

### Extension Not Loading
- Ensure TypeScript compilation succeeded (`yarn compile`)
- Check console for activation errors (Developer Tools → Console)
- Verify `package.json` manifest is correct

### Codespace Issues
- Check `.devcontainer/devcontainer.json` configuration
- Ensure required extensions are listed in devcontainer
- Verify Node.js version compatibility

### GitHub Actions Failing
- Check workflow logs in GitHub Actions tab
- Ensure repository has Actions enabled
- Verify workflow permissions for commenting on PRs

## Contributing

This is a demonstration project for internal team use. To replicate for your own extension:

1. Fork this repository
2. Update `package.json` with your extension details
3. Modify `src/extension.ts` with your functionality
4. Update documentation as needed
5. Test the PR preview workflow

## Next Steps

After understanding this workflow, consider:

- Adding unit tests with `@vscode/test-electron`
- Implementing more complex extension features
- Setting up automated publishing to VS Code Marketplace
- Adding integration with other GitHub features

