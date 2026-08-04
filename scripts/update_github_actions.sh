#!/bin/bash

set -euo pipefail

SCRIPT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Allow tests to point the script at a temporary workflow tree and manifest.
WORKFLOW_DIR="${WORKFLOW_DIR:-${SCRIPT_PATH}/../.github/workflows}"
ACTIONS_FILE="${ACTIONS_FILE:-${SCRIPT_PATH}/github_action_versions.yaml}"

find_workflow_files() {
  find "$WORKFLOW_DIR" -type f \( -name '*.yaml' -o -name '*.yml' \)
}

read_actions() {
  if command -v yq >/dev/null 2>&1; then
    yq e '.actions[]' "${ACTIONS_FILE}" -o=json | jq -c '.'
  else
    ruby -rjson -ryaml -e 'YAML.load_file(ARGV[0]).fetch("actions", []).each { |action| puts JSON.generate(action) }' "${ACTIONS_FILE}"
  fi
}

read_actions | while read -r action; do
  NAME=$(echo "${action}" | jq -r .name)
  VERSION=$(echo "${action}" | jq -r .version)
  ESCAPED_NAME=$(printf '%s' "${NAME}" | sed -e 's/[][(){}.^$+*?|\\/]/\\&/g')

  echo "Verifying action ${NAME} is set to version ${VERSION}"

  # Replace any v-prefixed tag for this action, including exact semver tags.
  sed_pattern="s!(${ESCAPED_NAME}@)v[^[:space:]\"']+!\\1${VERSION}!g"

  while IFS= read -r file; do
    echo "  Processing: ${file}"
    if grep -F -q "${NAME}@" "${file}"; then
      echo "    Match Found: Updating"
      sed -i '' -E "${sed_pattern}" "${file}"
    else
      echo "    No Match Found"
    fi
  done < <(find_workflow_files)
done

echo "Version updates complete."


