#!/usr/bin/env bash
set -e

# Generates a changelog for a given tag in a formatted markdown style,
# categorised by conventional commit type.
#
# Usage: ./scripts/generate-changelog.sh <tag>
# Example: ./scripts/generate-changelog.sh 2.51.0

if [ $# -lt 1 ]; then
  echo "Usage: $0 <tag>"
  echo "Example: $0 2.51.0"
  exit 1
fi

TAG="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Resolve the GitHub repo URL from the remote
REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo "")"
if [ -z "$REMOTE_URL" ]; then
  echo "Error: no git remote 'origin' found." >&2
  exit 1
fi
# Normalise SSH/HTTPS URLs to https://github.com/owner/repo
REPO_URL="$(echo "$REMOTE_URL" | sed -E 's#^git@github\.com:#https://github.com/#; s#\.git$##')"

# Verify the tag exists
if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag '$TAG' not found." >&2
  exit 1
fi

# Find the previous tag (by version sort, descending)
PREV_TAG="$(git tag --sort=-v:refname | grep -A1 "^${TAG}$" | tail -1)"
if [ -z "$PREV_TAG" ] || [ "$PREV_TAG" = "$TAG" ]; then
  echo "Error: could not determine the previous tag before '$TAG'." >&2
  exit 1
fi

COMMIT_URL_BASE="${REPO_URL}/commit"

# Use temp files for each category (compatible with bash 3)
TMPDIR_CL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_CL"' EXIT

# Initialise empty category files
for cat in feat fix refactor test docs chore build ci perf style; do
  touch "${TMPDIR_CL}/${cat}"
done

# Map type string to emoji
get_emoji() {
  case "$1" in
    feat)     echo ":sparkles:" ;;
    fix)      echo ":bug:" ;;
    refactor) echo ":recycle:" ;;
    test)     echo ":white_check_mark:" ;;
    docs)     echo ":books:" ;;
    chore)    echo ":wrench:" ;;
    build)    echo ":hammer:" ;;
    ci)       echo ":construction_worker:" ;;
    perf)     echo ":zap:" ;;
    style)    echo ":art:" ;;
  esac
}

# Map type string to heading
get_heading() {
  case "$1" in
    feat)     echo "New Features" ;;
    fix)      echo "Bug Fixes" ;;
    refactor) echo "Refactors" ;;
    test)     echo "Tests" ;;
    docs)     echo "Documentation" ;;
    chore)    echo "Chores" ;;
    build)    echo "Build" ;;
    ci)       echo "CI" ;;
    perf)     echo "Performance" ;;
    style)    echo "Style" ;;
  esac
}

SEPARATOR="<~>"

# Read commits between previous tag and this tag (excluding the release commit itself)
git log --format="%H${SEPARATOR}%s${SEPARATOR}%aN" "${PREV_TAG}..${TAG}" --reverse | while IFS= read -r line; do
  HASH="$(echo "$line" | awk -F'<~>' '{print $1}')"
  SUBJECT="$(echo "$line" | awk -F'<~>' '{print $2}')"
  AUTHOR="$(echo "$line" | awk -F'<~>' '{print $3}')"
  SHORT_HASH="$(echo "$HASH" | cut -c1-7)"

  # Skip the release commit itself
  if echo "$SUBJECT" | grep -qiE "^build: release "; then
    continue
  fi

  # Parse conventional commit: type(scope): description or type: description
  if echo "$SUBJECT" | grep -qE "^[A-Za-z]+(\([^)]*\))?:"; then
    TYPE="$(echo "$SUBJECT" | sed -E 's/^([A-Za-z]+)(\([^)]*\))?: .*/\1/' | tr '[:upper:]' '[:lower:]')"
    SCOPE="$(echo "$SUBJECT" | sed -nE 's/^[A-Za-z]+\(([^)]*)\): .*/\1/p')"
    DESC="$(echo "$SUBJECT" | sed -E 's/^[A-Za-z]+(\([^)]*\))?: //')"
  else
    TYPE="other"
    SCOPE=""
    DESC="$SUBJECT"
  fi

  # Extract PR number if present: (#NNN) at end of description
  PR_NUM="$(echo "$DESC" | sed -nE 's/.*\(#([0-9]+)\)$/\1/p')"
  # Remove the PR reference from the description
  DESC="$(echo "$DESC" | sed -E 's/ *\(#[0-9]+\)$//')"

  # Build the scope prefix
  SCOPE_PREFIX=""
  if [ -n "$SCOPE" ]; then
    SCOPE_PREFIX="**${SCOPE}**: "
  fi

  # Build the attribution suffix
  if [ -n "$PR_NUM" ]; then
    ATTRIBUTION="*(PR #${PR_NUM} by ${AUTHOR})*"
  else
    ATTRIBUTION="*(commit by ${AUTHOR})*"
  fi

  ENTRY="- [\`${SHORT_HASH}\`](${COMMIT_URL_BASE}/${HASH}) - ${SCOPE_PREFIX}${DESC} ${ATTRIBUTION}"

  # Map unknown types to chore
  case "$TYPE" in
    feat|fix|refactor|test|docs|chore|build|ci|perf|style) ;;
    *) TYPE="chore" ;;
  esac

  echo "$ENTRY" >> "${TMPDIR_CL}/${TYPE}"
done

# Output
echo ""
for TYPE in feat fix refactor test docs chore build ci perf style; do
  if [ -s "${TMPDIR_CL}/${TYPE}" ]; then
    echo "### $(get_emoji "$TYPE") $(get_heading "$TYPE")"
    cat "${TMPDIR_CL}/${TYPE}"
    echo ""
  fi
done
