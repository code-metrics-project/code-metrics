#!/bin/bash

SCRIPT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Directory containing the .yaml workflow files
WORKFLOW_DIR="${SCRIPT_PATH}/../.github/workflows"

# Path to the actions.yaml file
ACTIONS_FILE="${SCRIPT_PATH}/github_action_versions.yaml"
# Read each action and its version from actions.yaml using yq
yq e '.actions[]' "${ACTIONS_FILE}" -o=json | jq -c '.' | while read -r action; do
    NAME=$(echo ${action} | jq -r .name)
    VERSION=$(echo ${action} | jq -r .version)
    echo "Verifying action ${NAME} is set to version ${VERSION}"

    # Define the sed pattern for matching the action and version
    # This pattern assumes the action version follows the '@' symbol directly
    sed_pattern="s!($NAME@)v[0-9]+!\1$VERSION!g"

    # Loop over each yaml file in the workflow directory to update versions
    find "$WORKFLOW_DIR" -type f -name '*.yaml' | while read file; do
            # Check if the file contains the action (to avoid unnecessary processing)
            echo "  Processing: ${file}"
            grep -q "${NAME}@v" "${file}"
            if [ $? -eq 0 ]; then
                echo "    Match Found: Updating"
                # If the action is found, use sed to update the version in-place
                sed -i '' -E "${sed_pattern}" "${file}"
            else
              echo "    No Match Found"
            fi
        done
done

echo "Version updates complete."


