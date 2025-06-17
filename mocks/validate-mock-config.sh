#!/usr/bin/env bash
set -e

# Runs the config validation script against the mock
# configuration in the 'config' directory.

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
MOCK_CONFIG_DIR="$SCRIPT_DIR/config"
CONFIG_VALIDATOR_DIR="$SCRIPT_DIR/../backend/config"

cd "${CONFIG_VALIDATOR_DIR}"
./validate-config.sh "${MOCK_CONFIG_DIR}"
