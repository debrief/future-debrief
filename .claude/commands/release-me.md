# Automated Release Command

This command automates the software release process by updating the version in `package.json` and creating a corresponding git tag. It supports semantic versioning with automatic increment of major, minor, or patch versions.

## Usage

```bash
# Default to patch increment (e.g., 1.0.0 → 1.0.1)
release-me

# Specify increment type
release-me patch
release-me minor
release-me major
```

## Parameters

- **No parameter**: Defaults to `patch` increment
- **`patch`**: Increments patch version (1.2.3 → 1.2.4)
- **`minor`**: Increments minor version and resets patch to 0 (1.2.3 → 1.3.0)
- **`major`**: Increments major version and resets minor/patch to 0 (1.2.3 → 2.0.0)

## Process

The command uses Claude Code's native tools for a streamlined approach:

1. **Branch Validation** - Ensure running on main branch (or approved release branch)
2. **Pre-flight Checks** - Verify clean working directory and git repository status
3. **Read** package.json to get current version
4. **Calculate** new version based on increment type
5. **Edit** package.json with new version
6. **User Confirmation** - Prompt user to confirm git tag creation
7. **Create and Push** git tag using Bash tool

## Implementation

```

## Error Handling

The command implements comprehensive error handling with fail-fast approach:

- **Branch Validation**: Fails if not on main branch (or approved release branch)
- **Git Repository Check**: Fails if not in a git repository
- **Uncommitted Changes**: Fails if working directory is not clean
- **File Validation**: Fails if package.json doesn't exist or is invalid
- **Version Format**: Validates semantic version format (x.y.z)
- **JSON Parsing**: Handles package.json parsing errors gracefully
- **Git Operations**: Validates tag creation and provides rollback on failure
- **Parameter Validation**: Validates increment type parameter

## Integration with Release Process

This command integrates with the documented release process in `docs/Release-Process.md`:

1. **Preparation**: Replaces manual version editing in package.json
2. **Tag Creation**: Automates the `git tag v1.0.0` step
3. **Workflow Trigger**: Creates properly formatted tags that trigger GitHub Actions
4. **Error Prevention**: Prevents common mistakes in manual release process

## Examples

```bash
# Patch release (bug fixes)
$ release-me patch
🚀 Starting automated release process...
📦 Current version: 1.0.0
📈 New version: 1.0.0 → 1.0.1
✅ Updated package.json to version 1.0.1
✅ Git tag 'v1.0.1' created successfully

# Minor release (new features)
$ release-me minor
📦 Current version: 1.0.1
📈 New version: 1.0.1 → 1.1.0

# Major release (breaking changes)
$ release-me major
📦 Current version: 1.1.0
📈 New version: 1.1.0 → 2.0.0
```

## Critical Requirements

⚠️ **MUST be run from main branch** - The release command enforces branch validation to prevent releases from feature branches.

As documented in `docs/Release-Process.md`, releases must be created from the main branch:
```bash
git checkout main
git pull origin main
```

## User Interaction

The command requires user confirmation before creating and pushing the git tag:
- After updating package.json, the command will prompt for confirmation
- Once user confirms, the command will create the git tag and push it to remote
- This ensures the user has control over when the release is published
- The tag push automatically triggers GitHub Actions release workflow

## Notes

- Tag format follows GitHub Actions requirements: `v*.*.*`
- JSON formatting in package.json is preserved
- All operations are atomic - if any step fails, previous changes are rolled back
- Branch validation prevents accidental releases from feature branches
- Detailed logging helps with debugging and verification
- Automatic tag push eliminates the manual step of `git push origin v*.*.*`