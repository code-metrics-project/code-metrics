#!/bin/bash
#
# Advanced script to update downstream fork with current state of upstream 
# repository.
#
# Usage: 
#   ./scripts/downstream-fork/update-downstream-fork.sh [OPTIONS]
#
# Options:
#   --dry-run    Show what would be done without making changes
#   --force      Force update even if downstream has uncommitted changes
#   --commit     Commit the staged changes in downstream
#   --help       Show help message

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration
readonly UPSTREAM_REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." \
  && pwd)"
readonly DOWNSTREAM_REPO_PATH="${UPSTREAM_REPO_PATH}/../code-metrics-external-collab"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Script state variables
DRY_RUN=false
FORCE=false
COMMIT=false

# Git state variables (populated by check_upstream_state)
CURRENT_COMMIT_SHA=""
CURRENT_COMMIT_SHORT=""
UPSTREAM_BRANCH=""

#######################################
# Validate that repositories exist and are git repositories
# Globals:
#   UPSTREAM_REPO_PATH
#   DOWNSTREAM_REPO_PATH
#   RED
#   YELLOW
#   BLUE
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success, exits with 1 on failure
#######################################
validate_repositories() {
  echo -e "${BLUE}🚀 Starting downstream fork update process${NC}"
  echo -e "${BLUE}Upstream repo: ${UPSTREAM_REPO_PATH}${NC}"
  echo -e "${BLUE}Downstream repo: ${DOWNSTREAM_REPO_PATH}${NC}"

  if [[ ! -d "${UPSTREAM_REPO_PATH}/.git" ]]; then
    echo -e "${RED}❌ Error: Upstream path is not a git repository${NC}" >&2
    exit 1
  fi

  if [[ ! -d "${DOWNSTREAM_REPO_PATH}" ]]; then
    echo -e "${RED}❌ Error: Downstream repository not found at" \
      "${DOWNSTREAM_REPO_PATH}${NC}" >&2
    echo -e "${YELLOW}💡 You may need to clone it first:${NC}" >&2
    echo -e "${YELLOW}   git clone <downstream-repo-url>" \
      "${DOWNSTREAM_REPO_PATH}${NC}" >&2
    exit 1
  fi

  if [[ ! -d "${DOWNSTREAM_REPO_PATH}/.git" ]]; then
    echo -e "${RED}❌ Error: Downstream path is not a git repository${NC}" >&2
    exit 1
  fi
}

#######################################
# Check upstream repository state and get commit info
# Globals:
#   UPSTREAM_REPO_PATH
#   CURRENT_COMMIT_SHA (set)
#   CURRENT_COMMIT_SHORT (set)
#   UPSTREAM_BRANCH (set)
#   DRY_RUN
#   YELLOW
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success, exits with 0 if user aborts
#######################################
check_upstream_state() {
  cd "${UPSTREAM_REPO_PATH}" || exit 1
  CURRENT_COMMIT_SHA=$(git rev-parse HEAD)
  CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
  UPSTREAM_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  echo -e "${YELLOW}📋 Current upstream branch: ${UPSTREAM_BRANCH}${NC}"
  echo -e "${YELLOW}📋 Current upstream commit: ${CURRENT_COMMIT_SHA}${NC}"

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  Warning: Upstream repository has uncommitted" \
      "changes${NC}"
    echo -e "${YELLOW}    This script will sync the current working" \
      "state${NC}"
    if [[ "${DRY_RUN}" == "false" ]]; then
      local reply
      read -p "Continue? (y/N): " -n 1 -r reply
      echo
      if [[ ! "${reply}" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🛑 Aborted by user${NC}"
        exit 0
      fi
    fi
  fi
}

#######################################
# Check and prepare downstream repository
# Globals:
#   DOWNSTREAM_REPO_PATH
#   DRY_RUN
#   FORCE
#   RED
#   YELLOW
#   BLUE
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success, exits with 1 on failure
#######################################
prepare_downstream() {
  cd "${DOWNSTREAM_REPO_PATH}" || exit 1

  local downstream_branch
  local downstream_commit
  downstream_branch=$(git rev-parse --abbrev-ref HEAD)
  downstream_commit=$(git rev-parse HEAD)

  echo -e "${YELLOW}📋 Current downstream branch: ${downstream_branch}${NC}"
  echo -e "${YELLOW}📋 Current downstream commit: ${downstream_commit}${NC}"

  if [[ "${downstream_branch}" != "main" ]]; then
    echo -e "${BLUE}🔄 Switching to main branch${NC}"
    if [[ "${DRY_RUN}" == "false" ]]; then
      git checkout main
    fi
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    if [[ "${FORCE}" == "false" ]]; then
      echo -e "${RED}❌ Error: Downstream repository has uncommitted" \
        "changes${NC}" >&2
      echo -e "${RED}    Please commit or stash changes, or use --force" \
        "flag${NC}" >&2
      exit 1
    else
      echo -e "${YELLOW}⚠️  Warning: Forcing update despite uncommitted" \
        "changes${NC}"
      if [[ "${DRY_RUN}" == "false" ]]; then
        git reset --hard HEAD
      fi
    fi
  fi
}

#######################################
# Handle dry run mode
# Globals:
#   DRY_RUN
#   DOWNSTREAM_REPO_PATH
#   UPSTREAM_REPO_PATH
#   CURRENT_COMMIT_SHA
#   CYAN
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   Exits with 0 if dry run, returns normally otherwise
#######################################
handle_dry_run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo -e "${CYAN}🔍 DRY RUN: Would remove all files except .git${NC}"
    echo -e "${CYAN}🔍 DRY RUN: Would copy all files from upstream${NC}"
    echo -e "${CYAN}🔍 DRY RUN: Would commit with message:" \
      "'build: updated to ${CURRENT_COMMIT_SHA}'${NC}"
    
    echo -e "${CYAN}📁 Files that would be removed:${NC}"
    cd "${DOWNSTREAM_REPO_PATH}" || exit 1
    find . -mindepth 1 -maxdepth 1 \
      \( -name ".git" -o -name ".gitignore" \) -prune \
      -o -type f -print | head -20 || true

    echo -e "${CYAN}📁 Files that would be copied from upstream:${NC}"
    cd "${UPSTREAM_REPO_PATH}" || exit 1
    find . -mindepth 1 \( -name ".git" -o -name ".git/*" \) -prune \
      -o -type f -print | head -20 || true

    exit 0
  fi
}

#######################################
# Clean downstream repository (preserving .git)
# Globals:
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success
#######################################
clean_downstream() {
  echo -e "${BLUE}🧹 Cleaning downstream repository (preserving .git)${NC}"
  cd "${DOWNSTREAM_REPO_PATH}" || exit 1
  find . -mindepth 1 -maxdepth 1 \
    \( -name ".git" -o -name ".gitignore" \) -prune \
    -o -print0 | xargs -0 rm -rf
}

#######################################
# Copy files from upstream to downstream using rsync
# Globals:
#   UPSTREAM_REPO_PATH
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success
#######################################
copy_files_from_upstream() {
  echo -e "${BLUE}📁 Copying files from upstream repository${NC}"
  cd "${UPSTREAM_REPO_PATH}" || exit 1

  # Create a temporary exclusion file for rsync
  local temp_exclude_file
  temp_exclude_file=$(mktemp)
  cat > "${temp_exclude_file}" <<EOF
.git/
.git
node_modules/
machinelearning/
promosite/
desktop/
mcp/
.github/workflows/docs-site.yaml
.github/workflows/labeler.yml
.github/workflows/public-release.yaml
.github/workflows/update-github-container-reg.yaml
EOF

  # Use rsync to copy everything except excluded files
  rsync -av --exclude-from="${temp_exclude_file}" . \
    "${DOWNSTREAM_REPO_PATH}/"

  # Clean up temporary file
  rm "${temp_exclude_file}"
}

#######################################
# Shrink GitHub runner size
# Globals:
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   GREEN
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success
#######################################
shrink_github_runner_size() {
  echo -e "${BLUE}🔧 Updating 'ubuntu-latest-l' in GitHub workflow" \
    "files${NC}"
  local workflows_dir="${DOWNSTREAM_REPO_PATH}/.github/workflows"
  
  if [[ -d "${workflows_dir}" ]]; then
    while IFS= read -r -d '' wf; do
      if grep -q 'ubuntu-latest-l' "${wf}"; then
        # Use portable sed for in-place editing (Linux and macOS)
        if sed --version >/dev/null 2>&1; then
          sed -i 's/ubuntu-latest-l/ubuntu-latest/g' "${wf}"
        else
          sed -i '' 's/ubuntu-latest-l/ubuntu-latest/g' "${wf}"
        fi
        echo -e "${GREEN}  ✓ Updated in ${wf}${NC}"
      fi
    done < <(find "${workflows_dir}" \
      \( -name "*.yml" -o -name "*.yaml" \) -type f -print0)
  fi
}

#######################################
# Disable coverage collection in downstream workflows
# Globals:
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   GREEN
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success
#######################################
disable_coverage_in_workflows() {
  echo -e "${BLUE}🔧 Disabling COVERAGE_ENABLED in GitHub workflow files" \
    "for downstream${NC}"
  local workflows_dir="${DOWNSTREAM_REPO_PATH}/.github/workflows"
  
  if [[ -d "${workflows_dir}" ]]; then
    while IFS= read -r -d '' wf; do
      if grep -q 'COVERAGE_ENABLED: "true"' "${wf}"; then
        # Use portable sed for in-place editing (Linux and macOS)
        if sed --version >/dev/null 2>&1; then
          sed -i 's/COVERAGE_ENABLED: "true"/COVERAGE_ENABLED: "false"/g' \
            "${wf}"
        else
          sed -i '' 's/COVERAGE_ENABLED: "true"/COVERAGE_ENABLED: "false"/g' \
            "${wf}"
        fi
        echo -e "${GREEN}  ✓ Disabled coverage in ${wf}${NC}"
      fi
    done < <(find "${workflows_dir}" \
      \( -name "*.yml" -o -name "*.yaml" \) -type f -print0)
  fi
}

#######################################
# Copy license files to downstream root
# Globals:
#   SCRIPT_DIR
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   GREEN
#   RED
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success, exits with 1 on failure
#######################################
copy_license_files() {
  echo -e "${BLUE}📄 Copying license files to downstream root${NC}"
  local license_files=("LICENSE")
  local license_file
  
  for license_file in "${license_files[@]}"; do
    if [[ -f "${SCRIPT_DIR}/${license_file}" ]]; then
      cp "${SCRIPT_DIR}/${license_file}" "${DOWNSTREAM_REPO_PATH}/"
      echo -e "${GREEN}  ✓ Copied ${license_file} from scripts" \
        "directory${NC}"
    else
      echo -e "${RED}❌  Error: ${license_file} not found in scripts" \
        "directory${NC}" >&2
      exit 1
    fi
  done
}

#######################################
# Stage changes in downstream repository
# Globals:
#   DOWNSTREAM_REPO_PATH
#   BLUE
#   GREEN
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   Exits with 0 if no changes, returns normally otherwise
#######################################
stage_changes() {
  echo -e "${BLUE}📝 Staging all changes${NC}"
  cd "${DOWNSTREAM_REPO_PATH}" || exit 1
  git add -A

  if git diff --cached --quiet; then
    echo -e "${GREEN}✅ No changes detected - downstream is already" \
      "up to date${NC}"
    exit 0
  fi
}

#######################################
# Show summary of changes
# Globals:
#   GREEN
#   YELLOW
#   RED
#   NC
# Arguments:
#   None
# Outputs:
#   Writes summary to stdout
# Returns:
#   0 on success
#######################################
show_change_summary() {
  echo -e "${YELLOW}📊 Summary of changes:${NC}"
  git diff --cached --stat

  local added_files
  local modified_files
  local deleted_files
  added_files=$(git diff --cached --diff-filter=A --name-only \
    | wc -l | tr -d ' ')
  modified_files=$(git diff --cached --diff-filter=M --name-only \
    | wc -l | tr -d ' ')
  deleted_files=$(git diff --cached --diff-filter=D --name-only \
    | wc -l | tr -d ' ')

  echo -e "${GREEN}  📄 Added files: ${added_files}${NC}"
  echo -e "${YELLOW}  📝 Modified files: ${modified_files}${NC}"
  echo -e "${RED}  🗑️  Deleted files: ${deleted_files}${NC}"
}

#######################################
# Commit changes if requested
# Globals:
#   COMMIT
#   CURRENT_COMMIT_SHA
#   CURRENT_COMMIT_SHORT
#   BLUE
#   GREEN
#   YELLOW
#   CYAN
#   NC
# Arguments:
#   None
# Outputs:
#   Writes status messages to stdout
# Returns:
#   0 on success, exits with 0 if commit not requested
#######################################
commit_changes() {
  if [[ "${COMMIT}" == "true" ]]; then
    local commit_message="build: updated to ${CURRENT_COMMIT_SHA}"
    echo -e "${BLUE}💾 Committing changes with message:" \
      "'${commit_message}'${NC}"
    git commit -m "${commit_message}"

    local new_commit_sha
    new_commit_sha=$(git rev-parse HEAD)

    echo -e "${GREEN}✅ Successfully updated downstream fork!${NC}"
    echo -e "${GREEN}   New commit SHA: ${new_commit_sha}${NC}"
    echo -e "${GREEN}   Updated to upstream commit:" \
      "${CURRENT_COMMIT_SHORT}${NC}"

    echo -e "${BLUE}📋 Commit details:${NC}"
    git show --stat HEAD || true

    echo -e "${CYAN}💡 Next steps:${NC}"
    echo -e "${CYAN}   - Review the changes: git show HEAD${NC}"
    echo -e "${CYAN}   - Push to remote: git push origin main${NC}"
  else
    echo -e "${YELLOW}ℹ️  Changes staged but not committed." \
      "Run the script with --commit to create the commit.${NC}"
    echo -e "${CYAN}💡 Next steps:${NC}"
    echo -e "${CYAN}   - To commit: re-run with --commit" \
      "(CI workflow passes this automatically)${NC}"
    exit 0
  fi
}

#######################################
# Main function
#######################################
main() {
  validate_repositories
  check_upstream_state
  prepare_downstream
  handle_dry_run
  clean_downstream
  copy_files_from_upstream
  shrink_github_runner_size
  disable_coverage_in_workflows
  copy_license_files
  stage_changes
  show_change_summary
  commit_changes
}

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
    --commit)
      COMMIT=true
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [OPTIONS]

Update downstream fork with current state of upstream repository.

OPTIONS:
  --dry-run    Show what would be done without making changes
  --force      Force update even if downstream has uncommitted changes
  --commit     Commit the staged changes in downstream
  -h, --help   Show this help message

EOF
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}" >&2
      exit 1
      ;;
  esac
done

if [[ "${DRY_RUN}" == "true" ]]; then
  echo -e "${CYAN}🔍 DRY RUN MODE - No changes will be made${NC}"
fi

# Execute main function
main
