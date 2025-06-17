#!/usr/bin/env bash
set -e

# Runs the config validation script against all files
# in a 'config' directory.

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Ensure CONFIG_DIR is set
if [ -z "$1" ]; then
  echo "Usage: $0 <config-directory>"
  exit 1
fi

CONFIG_DIR="$1"

# Validate the configuration file
# $1: The path to the configuration file
function validate_config_file() {
    local config_file="$1"
    echo "Validating configuration file: ${config_file}"
    pushd "${SCRIPT_DIR}" > /dev/null
    node validate-config.js "${config_file}"
    popd > /dev/null
}

# Validate all configuration files
for config_file in $(find "${CONFIG_DIR}" -name "*-config*.yaml"); do
  validate_config_file "${config_file}"
done

echo "All configuration files are valid."
