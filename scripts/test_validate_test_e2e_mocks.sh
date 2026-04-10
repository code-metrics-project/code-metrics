#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/validate-test_e2e_mocks.sh"

function create_fixture() {
  local fixture_dir
  fixture_dir="$(mktemp -d)"

  mkdir -p "${fixture_dir}/backend/config/examples" "${fixture_dir}/frontend" "${fixture_dir}/mocks/config"
  printf '22\n' > "${fixture_dir}/backend/.nvmrc"
  : > "${fixture_dir}/backend/.env.template"

  for file in remote-config.yaml workload-config.yaml users.json pipeline-config.yaml quality-gates-config.yaml; do
    : > "${fixture_dir}/backend/config/examples/${file}"
  done

  : > "${fixture_dir}/backend/config/examples/secrets.yaml.example"
  : > "${fixture_dir}/mocks/config/license.yaml"

  printf '%s\n' "${fixture_dir}"
}

function test_external_keycloak_configuration() {
  local fixture_dir
  fixture_dir="$(create_fixture)"

  (
    export ROOT_DIR="${fixture_dir}"
    export VALIDATE_E2E_MOCKS_SOURCE_ONLY=true
    export KEYCLOAK_MANAGED_EXTERNALLY=true
    export KEYCLOAK_ISSUER_BASE_URL="http://keycloak:8080/realms/codemetrics"
    export KEYCLOAK_HEALTHCHECK_URL="http://keycloak:8080/realms/master"
    source "${SCRIPT_PATH}"

    AUTH_MODE="keycloak"
    setup_config_dir
    configure_backend_env

    grep -q '^OIDC_ISSUER_BASE_URL=http://keycloak:8080/realms/codemetrics$' "${BACKEND_DIR}/.env"
  )

  rm -rf "${fixture_dir}"
}

function test_external_keycloak_skips_docker_management() {
  local fixture_dir
  fixture_dir="$(create_fixture)"

  (
    export ROOT_DIR="${fixture_dir}"
    export VALIDATE_E2E_MOCKS_SOURCE_ONLY=true
    export KEYCLOAK_MANAGED_EXTERNALLY=true
    export KEYCLOAK_HEALTHCHECK_URL="http://keycloak:8080/realms/master"
    source "${SCRIPT_PATH}"

    AUTH_MODE="keycloak"
    local calls_file
    calls_file="$(mktemp)"

    curl() { return 0; }
    sleep() { :; }
    docker() { echo docker >> "${calls_file}"; }

    start_keycloak_if_required
    stop_keycloak_if_required

    if [[ -s "${calls_file}" ]]; then
      echo "Expected workflow-managed Keycloak path to avoid docker compose" >&2
      exit 1
    fi

    rm -f "${calls_file}"
  )

  rm -rf "${fixture_dir}"
}

test_external_keycloak_configuration
test_external_keycloak_skips_docker_management

echo "validate-test_e2e_mocks.sh checks passed"