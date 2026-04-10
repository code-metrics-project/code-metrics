#!/usr/bin/env bash
set -euo pipefail

AUTH_MODE="file"
SKIP_INSTALL="false"
TEST_COMMAND=""

ROOT_DIR="${ROOT_DIR:-${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}}"
CONFIG_DIR="$(mktemp -d -t code-metrics-config-XXXXXX)"
KEYCLOAK_ISSUER_BASE_URL="${KEYCLOAK_ISSUER_BASE_URL:-http://localhost:8086/realms/codemetrics}"
KEYCLOAK_HEALTHCHECK_URL="${KEYCLOAK_HEALTHCHECK_URL:-http://localhost:8086/realms/master}"
KEYCLOAK_MANAGED_EXTERNALLY="${KEYCLOAK_MANAGED_EXTERNALLY:-false}"

MOCKS_DIR="${ROOT_DIR}/mocks"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_NPM_PID=""

function usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --auth-mode <file|oidc|keycloak> Authentication mode (default: file)
  --skip-install                 Skip backend/frontend dependency installation
  --test-command <command>       Override test command (default based on auth mode)
  --help                         Show this help

Examples:
  $(basename "$0") --auth-mode file --skip-install
  $(basename "$0") --auth-mode oidc --skip-install
  $(basename "$0") --auth-mode keycloak --skip-install
EOF
}

function parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --auth-mode)
        AUTH_MODE="$2"
        shift 2
        ;;
      --skip-install)
        SKIP_INSTALL="true"
        shift
        ;;
      --test-command)
        TEST_COMMAND="$2"
        shift 2
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ "$AUTH_MODE" != "file" && "$AUTH_MODE" != "oidc" && "$AUTH_MODE" != "keycloak" ]]; then
    echo "Invalid --auth-mode '${AUTH_MODE}'. Must be one of: file, oidc, keycloak"
    exit 1
  fi
}

function check_node_version() {
  local required_node_version
  local current_node_version

  required_node_version=$(cat "${BACKEND_DIR}/.nvmrc")
  current_node_version=$(node -v | grep -oE '[0-9]+' | head -1)

  if [[ "$current_node_version" -lt "$required_node_version" ]]; then
    echo "Node.js version must be >= ${required_node_version}. Current version is $(node -v). Exiting."
    exit 1
  fi
}

function check_ports() {
  local ports=(3000 3001)
  if [[ "$AUTH_MODE" == "keycloak" && "$KEYCLOAK_MANAGED_EXTERNALLY" != "true" ]]; then
    ports+=(8086)
  fi

  for port in "${ports[@]}"; do
    if lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null; then
      echo "Port ${port} is already in use! Exiting."
      exit 1
    fi
  done
}

function install_deps() {
  cd "${BACKEND_DIR}"
  echo "Installing backend dependencies..."
  npm ci

  cd "${FRONTEND_DIR}"
  echo "Installing frontend dependencies..."
  bun install --frozen-lockfile
}

function setup_config_dir() {
  export CONFIG_DIR
  echo "Using config dir: ${CONFIG_DIR}"

  cp "${BACKEND_DIR}/config/examples/remote-config.yaml" "${CONFIG_DIR}/remote-config.yaml"
  cp "${BACKEND_DIR}/config/examples/workload-config.yaml" "${CONFIG_DIR}/workload-config.yaml"
  cp "${BACKEND_DIR}/config/examples/users.json" "${CONFIG_DIR}/users.json"
  cp "${BACKEND_DIR}/config/examples/secrets.yaml.example" "${CONFIG_DIR}/secrets.yaml"
  cp "${BACKEND_DIR}/config/examples/pipeline-config.yaml" "${CONFIG_DIR}/pipeline-config.yaml"
  cp "${BACKEND_DIR}/config/examples/quality-gates-config.yaml" "${CONFIG_DIR}/quality-gates-config.yaml"
  cp "${MOCKS_DIR}/config/license.yaml" "${CONFIG_DIR}/license.yaml"
}

function configure_backend_env() {
  cd "${BACKEND_DIR}"

  cp .env.template .env
  {
    echo "DATASTORE_IMPL=inmem"
    echo "LOG_ACCESS_LOGS=false"
  } >> .env

  if [[ "$AUTH_MODE" == "oidc" ]]; then
    {
      echo "AUTHENTICATOR_IMPL=oidc"
      echo "OIDC_ISSUER_BASE_URL=http://localhost:8080/oidc"
      echo "OIDC_CLIENT_ID=codemetrics"
      echo "OIDC_CLIENT_SECRET=changeme"
    } >> .env
  fi

  if [[ "$AUTH_MODE" == "keycloak" ]]; then
    {
      echo "AUTHENTICATOR_IMPL=oidc"
      echo "OIDC_ISSUER_BASE_URL=${KEYCLOAK_ISSUER_BASE_URL}"
      echo "OIDC_CLIENT_ID=codemetrics"
      echo "OIDC_CLIENT_SECRET=changeme"
    } >> .env
  fi

  perl -0pi -e 's|CORS_ORIGIN=https://code-metrics\.localhost:3001|CORS_ORIGIN=http://code-metrics.localhost:3001|g' .env
}

function wait_for_http_url() {
  local readiness_url="$1"
  local service_name="$2"

  echo "Waiting for ${service_name} to come up on ${readiness_url}..."
  while ! curl -fsS "${readiness_url}" >/dev/null; do
    sleep 1
  done
  echo "${service_name} is up and running"
}

function start_keycloak_if_required() {
  if [[ "$AUTH_MODE" != "keycloak" ]]; then
    return
  fi

  if [[ "$KEYCLOAK_MANAGED_EXTERNALLY" == "true" ]]; then
    wait_for_http_url "${KEYCLOAK_HEALTHCHECK_URL}" "workflow-managed Keycloak"
    return
  fi

  cd "${ROOT_DIR}"
  docker compose -f compose/docker-compose-keycloak.yaml --project-directory . up -d

  wait_for_http_url "${KEYCLOAK_HEALTHCHECK_URL}" "Keycloak"
}

function start_mocks() {
  cd "${MOCKS_DIR}"
  imposter up -r --log-level warn &

  wait_for_http_url "http://localhost:8080/system/status" "Mocks"
}

function start_backend() {
  cd "${BACKEND_DIR}"
  mkdir -p logs
  npm run dev > logs/backend.log 2>&1 &
  BACKEND_NPM_PID="$!"

  wait_for_http_url "http://localhost:3000/api/health/readiness" "Backend"
}

function resolve_test_command() {
  if [[ -n "$TEST_COMMAND" ]]; then
    return
  fi

  case "$AUTH_MODE" in
    file)
      TEST_COMMAND="bun run test:e2e:coverage"
      ;;
    oidc)
      TEST_COMMAND="bun run test:e2e:oidc:coverage"
      ;;
    keycloak)
      TEST_COMMAND="bun run test:e2e:keycloak:coverage"
      ;;
  esac
}

function configure_coverage_profile() {
  if [[ -n "${COVERAGE_PROFILE:-}" ]]; then
    export COVERAGE_PROFILE
    return
  fi

  case "$AUTH_MODE" in
    file)
      COVERAGE_PROFILE="e2e"
      ;;
    oidc)
      COVERAGE_PROFILE="oidc"
      ;;
    keycloak)
      COVERAGE_PROFILE="keycloak"
      ;;
  esac

  export COVERAGE_PROFILE
}

function run_e2e_tests() {
  cd "${FRONTEND_DIR}"
  echo "Running Playwright tests: ${TEST_COMMAND}"
  eval "${TEST_COMMAND}"
}

function stop_backend() {
  echo "Stopping backend"
  if [[ -n "${BACKEND_NPM_PID}" ]]; then
    kill "${BACKEND_NPM_PID}" || true
  fi
  pkill -f "node.*backend" || true
}

function stop_mocks() {
  echo "Stopping mocks"
  imposter down || true
}

function stop_keycloak_if_required() {
  if [[ "$AUTH_MODE" != "keycloak" ]]; then
    return
  fi

  if [[ "$KEYCLOAK_MANAGED_EXTERNALLY" == "true" ]]; then
    echo "Workflow-managed Keycloak will be stopped by GitHub Actions"
    return
  fi

  cd "${ROOT_DIR}"
  echo "Stopping Keycloak"
  docker compose -f compose/docker-compose-keycloak.yaml --project-directory . down || true
}

function cleanup() {
  stop_backend
  stop_mocks
  stop_keycloak_if_required
}

function main() {
  parse_args "$@"
  trap cleanup EXIT

  check_node_version
  check_ports

  if [[ "$SKIP_INSTALL" != "true" ]]; then
    install_deps
  fi

  resolve_test_command
  configure_coverage_profile
  setup_config_dir
  configure_backend_env
  start_keycloak_if_required
  start_mocks
  start_backend
  run_e2e_tests
}

if [[ "${VALIDATE_E2E_MOCKS_SOURCE_ONLY:-false}" != "true" ]]; then
  main "$@"
fi
