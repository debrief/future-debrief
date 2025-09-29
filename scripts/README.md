# Fly.io Cleanup Script

This directory contains a single comprehensive script to manage and cleanup orphaned fly.io apps created during PR preview workflows.

## Script: `cleanup-flyio-apps.sh`

A comprehensive tool for managing fly.io PR apps with safety-first defaults.

### Quick Start

```bash
# Safe: Just show what PR apps exist (default behavior)
./scripts/cleanup-flyio-apps.sh

# Save money: Destroy all orphaned PR apps immediately
./scripts/cleanup-flyio-apps.sh --destroy

# Interactive: Ask before destroying each app
./scripts/cleanup-flyio-apps.sh --interactive
```

### All Options

```bash
# List orphaned apps without destroying (default - safe)
./scripts/cleanup-flyio-apps.sh
./scripts/cleanup-flyio-apps.sh --list

# Destroy all PR apps immediately (saves money)
./scripts/cleanup-flyio-apps.sh --destroy

# Interactive mode - ask for confirmation
./scripts/cleanup-flyio-apps.sh --interactive

# Show help
./scripts/cleanup-flyio-apps.sh --help
```

### Features
- ✅ **Safety First**: Defaults to list-only mode
- ✅ **Smart Detection**: Finds both Tool Vault and VS Code PR apps
- ✅ **Production Safe**: Never affects main production apps
- ✅ **Detailed Output**: Shows app names, status, and URLs
- ✅ **Cost Awareness**: Highlights financial impact
- ✅ **Authentication Check**: Verifies flyctl setup
- ✅ **Error Handling**: Graceful failures with helpful messages

## App Patterns Detected

The scripts look for apps matching these patterns:

- **Tool Vault**: `toolvault-pr-{NUMBER}`
- **VS Code**: `pr-{NUMBER}-futuredebrief`

Examples:
- `toolvault-pr-123`
- `pr-456-futuredebrief`

## Prerequisites

1. **Install flyctl**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate with fly.io**:
   ```bash
   flyctl auth login
   ```

## When to Use

### Regular Maintenance
Run the comprehensive script periodically to check for orphaned apps:
```bash
./scripts/cleanup-pr-apps.sh --list-only
```

### After PR Merges
If you notice the cleanup workflows didn't run, use the interactive mode:
```bash
./scripts/cleanup-pr-apps.sh
```

### Emergency Cleanup
For immediate cleanup of all PR apps (use with caution):
```bash
./scripts/quick-cleanup.sh
```

## Safety Notes

- ⚠️ These scripts will **permanently delete** fly.io apps
- 🔒 Always run `--list-only` first to see what will be affected
- 🔍 The scripts only target apps with PR naming patterns
- ✅ Production apps (without PR patterns) are safe

## Troubleshooting

### "flyctl not found"
Install flyctl using the installation command above.

### "Not authenticated"
Run `flyctl auth login` to authenticate.

### "No apps found"
This is good! It means no orphaned PR apps exist.

### "Failed to destroy app"
- Check if the app exists: `flyctl status --app <app-name>`
- Verify permissions with: `flyctl auth whoami`
- Try manual deletion: `flyctl apps destroy <app-name> --yes`