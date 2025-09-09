#!/bin/bash

# Advanced script to update downstream fork with current state of upstream repository
# Usage: ./scripts/downstream-fork/update-downstream-fork-advanced.sh [--dry-run] [--force]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
UPSTREAM_REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOWNSTREAM_REPO_PATH="${UPSTREAM_REPO_PATH}/../code-metrics-external-collab"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--dry-run] [--force]"
            echo "  --dry-run    Show what would be done without making changes"
            echo "  --force      Force update even if downstream has uncommitted changes"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}🔍 DRY RUN MODE - No changes will be made${NC}"
fi

echo -e "${BLUE}🚀 Starting downstream fork update process${NC}"
echo -e "${BLUE}Upstream repo: ${UPSTREAM_REPO_PATH}${NC}"
echo -e "${BLUE}Downstream repo: ${DOWNSTREAM_REPO_PATH}${NC}"

# Validate that we're in a git repository
if [ ! -d "${UPSTREAM_REPO_PATH}/.git" ]; then
    echo -e "${RED}❌ Error: Upstream path is not a git repository${NC}"
    exit 1
fi

# Validate that downstream repository exists
if [ ! -d "${DOWNSTREAM_REPO_PATH}" ]; then
    echo -e "${RED}❌ Error: Downstream repository not found at ${DOWNSTREAM_REPO_PATH}${NC}"
    echo -e "${YELLOW}💡 You may need to clone it first:${NC}"
    echo -e "${YELLOW}   git clone <downstream-repo-url> ${DOWNSTREAM_REPO_PATH}${NC}"
    exit 1
fi

if [ ! -d "${DOWNSTREAM_REPO_PATH}/.git" ]; then
    echo -e "${RED}❌ Error: Downstream path is not a git repository${NC}"
    exit 1
fi

# Get current commit SHA from upstream
cd "${UPSTREAM_REPO_PATH}"
CURRENT_COMMIT_SHA=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
UPSTREAM_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "${YELLOW}📋 Current upstream branch: ${UPSTREAM_BRANCH}${NC}"
echo -e "${YELLOW}📋 Current upstream commit: ${CURRENT_COMMIT_SHA}${NC}"

# Check if upstream repository is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  Warning: Upstream repository has uncommitted changes${NC}"
    echo -e "${YELLOW}    This script will sync the current working state${NC}"
    if [ "$DRY_RUN" = false ]; then
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🛑 Aborted by user${NC}"
            exit 0
        fi
    fi
fi

# Navigate to downstream repository
cd "${DOWNSTREAM_REPO_PATH}"

# Get current state of downstream
DOWNSTREAM_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DOWNSTREAM_COMMIT=$(git rev-parse HEAD)

echo -e "${YELLOW}📋 Current downstream branch: ${DOWNSTREAM_BRANCH}${NC}"
echo -e "${YELLOW}📋 Current downstream commit: ${DOWNSTREAM_COMMIT}${NC}"

# Ensure we're on the main branch
if [ "$DOWNSTREAM_BRANCH" != "main" ]; then
    echo -e "${BLUE}🔄 Switching to main branch${NC}"
    if [ "$DRY_RUN" = false ]; then
        git checkout main
    fi
fi

# Check if downstream has uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    if [ "$FORCE" = false ]; then
        echo -e "${RED}❌ Error: Downstream repository has uncommitted changes${NC}"
        echo -e "${RED}    Please commit or stash changes, or use --force flag${NC}"
        exit 1
    else
        echo -e "${YELLOW}⚠️  Warning: Forcing update despite uncommitted changes${NC}"
        if [ "$DRY_RUN" = false ]; then
            git reset --hard HEAD
        fi
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}🔍 DRY RUN: Would remove all files except .git${NC}"
    echo -e "${CYAN}🔍 DRY RUN: Would copy all files from upstream${NC}"
    echo -e "${CYAN}🔍 DRY RUN: Would commit with message: 'build: updated to ${CURRENT_COMMIT_SHA}'${NC}"
    
    # Show what files would be affected
    echo -e "${CYAN}📁 Files that would be removed:${NC}"
    find . -mindepth 1 -maxdepth 1 \( -name ".git" -o -name ".gitignore" \) -prune -o -type f -print | head -20
    
    echo -e "${CYAN}📁 Files that would be copied from upstream:${NC}"
    cd "${UPSTREAM_REPO_PATH}"
    find . -mindepth 1 \( -name ".git" -o -name ".git/*" \) -prune -o -type f -print | head -20
    
    exit 0
fi

# Remove all files except .git directory
echo -e "${BLUE}🧹 Cleaning downstream repository (preserving .git)${NC}"
find . -mindepth 1 -maxdepth 1 \( -name ".git" -o -name ".gitignore" \) -prune -o -print0 | xargs -0 rm -rf

# Copy all files from upstream (excluding .git directory)
echo -e "${BLUE}📁 Copying files from upstream repository${NC}"

cd "${UPSTREAM_REPO_PATH}"

# Create a temporary exclusion file for rsync
TEMP_EXCLUDE_FILE=$(mktemp)
echo ".git/" > "$TEMP_EXCLUDE_FILE"
echo ".git" >> "$TEMP_EXCLUDE_FILE"
echo "node_modules/" >> "$TEMP_EXCLUDE_FILE"
echo "machinelearning/" >> "$TEMP_EXCLUDE_FILE"
echo "promosite/" >> "$TEMP_EXCLUDE_FILE"
echo "desktop/" >> "$TEMP_EXCLUDE_FILE"
echo "mcp/" >> "$TEMP_EXCLUDE_FILE"
echo ".github/workflows/docs-site.yaml" >> "$TEMP_EXCLUDE_FILE"
echo ".github/workflows/labeler.yml" >> "$TEMP_EXCLUDE_FILE"
echo ".github/workflows/public-release.yaml" >> "$TEMP_EXCLUDE_FILE"
echo ".github/workflows/update-github-container-reg.yaml" >> "$TEMP_EXCLUDE_FILE"


# Use rsync to copy everything except .git directory
rsync -av --exclude-from="$TEMP_EXCLUDE_FILE" . "${DOWNSTREAM_REPO_PATH}/"

# After copying, update 'ubuntu-latest-l' typo in GitHub workflow files
echo -e "${BLUE}🔧 Updating 'ubuntu-latest-l' typos in GitHub workflow files${NC}"
WORKFLOWS_DIR="${DOWNSTREAM_REPO_PATH}/.github/workflows"
if [ -d "$WORKFLOWS_DIR" ]; then
    find "$WORKFLOWS_DIR" -type f -name "*.yml" -o -name "*.yaml" | while read -r wf; do
        if grep -q 'ubuntu-latest-l' "$wf"; then
            sed -i '' 's/ubuntu-latest-l/ubuntu-latest/g' "$wf"
            echo -e "${GREEN}  ✓ Updated in $wf${NC}"
        fi
    done
fi

# Copy license files from scripts directory to downstream root
echo -e "${BLUE}📄 Copying license files to downstream root${NC}"
for license_file in "COPYING" "COPYING.LESSER" "LICENSE"; do
    if [ -f "${SCRIPT_DIR}/${license_file}" ]; then
        cp "${SCRIPT_DIR}/${license_file}" "${DOWNSTREAM_REPO_PATH}/"
        echo -e "${GREEN}  ✓ Copied ${license_file} from scripts directory${NC}"
    else
        echo -e "${RED}❌  Error: ${license_file} not found in scripts directory${NC}"
        exit 1
    fi
done

# Clean up temporary file
rm "$TEMP_EXCLUDE_FILE"

# Navigate back to downstream repository
cd "${DOWNSTREAM_REPO_PATH}"

# Stage all changes (additions, modifications, deletions)
echo -e "${BLUE}📝 Staging all changes${NC}"
git add -A

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo -e "${GREEN}✅ No changes detected - downstream is already up to date${NC}"
    exit 0
fi

# Show summary of changes
echo -e "${YELLOW}📊 Summary of changes:${NC}"
git diff --cached --stat

# Show detailed change summary
ADDED_FILES=$(git diff --cached --diff-filter=A --name-only | wc -l | tr -d ' ')
MODIFIED_FILES=$(git diff --cached --diff-filter=M --name-only | wc -l | tr -d ' ')
DELETED_FILES=$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')

echo -e "${GREEN}  📄 Added files: ${ADDED_FILES}${NC}"
echo -e "${YELLOW}  📝 Modified files: ${MODIFIED_FILES}${NC}"
echo -e "${RED}  🗑️  Deleted files: ${DELETED_FILES}${NC}"

# Ask for confirmation unless forced
if [ "$FORCE" = false ]; then
    echo
    read -p "Proceed with commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🛑 Aborted by user${NC}"
        git reset HEAD
        exit 0
    fi
fi

# Commit the changes
COMMIT_MESSAGE="build: updated to ${CURRENT_COMMIT_SHA}"
echo -e "${BLUE}💾 Committing changes with message: '${COMMIT_MESSAGE}'${NC}"
git commit -m "${COMMIT_MESSAGE}"

NEW_COMMIT_SHA=$(git rev-parse HEAD)

echo -e "${GREEN}✅ Successfully updated downstream fork!${NC}"
echo -e "${GREEN}   New commit SHA: ${NEW_COMMIT_SHA}${NC}"
echo -e "${GREEN}   Updated to upstream commit: ${CURRENT_COMMIT_SHORT}${NC}"

# Optional: Show the commit that was just created
echo -e "${BLUE}📋 Commit details:${NC}"
git show --stat HEAD

echo -e "${CYAN}💡 Next steps:${NC}"
echo -e "${CYAN}   - Review the changes: git show HEAD${NC}"
echo -e "${CYAN}   - Push to remote: git push origin main${NC}"
