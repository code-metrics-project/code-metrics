# Downstream Fork Update Script

This directory contains a script to update the downstream fork repository with the current state of the upstream repository.

## Script

### `update-downstream-fork.sh`

A comprehensive script that performs a complete sync of the downstream repository with safety checks and options.

**Usage:**

```bash
# Basic usage
./scripts/downstream-fork/update-downstream-fork.sh

# Dry run to see what would be changed
./scripts/downstream-fork/update-downstream-fork.sh --dry-run

# Force update even if downstream has uncommitted changes
./scripts/downstream-fork/update-downstream-fork.sh --force

# Show help
./scripts/downstream-fork/update-downstream-fork.sh --help
```

## What the script does

1. **Validate repositories**: Ensure both upstream and downstream are valid git repositories
2. **Get current commit**: Capture the current commit SHA from the upstream repository
3. **Safety checks**: Verify the downstream repository is clean (unless `--force` is used)
4. **Clean downstream**: Remove all files from downstream except `.git` directory
5. **Copy files**: Copy all files from upstream to downstream (excluding `.git` and `node_modules`)
6. **Copy license files**: Copy COPYING, COPYING.LESSER, and LICENSE files from scripts directory to downstream root
7. **Stage changes**: Add all changes (additions, deletions, modifications) to git
8. **Commit**: Create a commit with message format: `build: updated to <commit-sha>`

## Repository Structure

- **Upstream**: `/path/to/code-metrics` (this repository)
- **Downstream**: `/path/to/code-metrics-external-collab`

## Important Notes

- The downstream repository should have its main branch updated
- All file additions, modifications, and deletions will be synchronized
- Excludes some directories from synchronization
- License files (COPYING, COPYING.LESSER, LICENSE) are copied from the scripts directory to downstream root (these are specific to the downstream fork)
- The commit message will include the full SHA of the upstream commit
- The scripts preserve the `.git` directory in the downstream repository
- History in the downstream repository is maintained (only new commits are added)

## Safety Features

- Checks for uncommitted changes in both repositories
- Provides summary of changes before committing
- Supports dry-run mode to preview changes
- Validates git repository structure
- Confirms user intent before destructive operations

## Example Output

```
🚀 Starting downstream fork update process
Upstream repo: /Users/someuser/projects/code-metrics
Downstream repo: /Users/someuser/projects/code-metrics-external-collab
📋 Current upstream commit: 7f0bee7eda98d50124ca813a5dc99965c6f41aa2
🧹 Cleaning downstream repository (preserving .git)
📁 Copying files from upstream repository
📝 Staging all changes
📊 Summary of changes:
💾 Committing changes with message: 'build: updated to 7f0bee7eda98d50124ca813a5dc99965c6f41aa2'
✅ Successfully updated downstream fork!
```
