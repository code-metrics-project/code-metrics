#!/usr/bin/env bash
set -e

ROOT_DIR="$( git rev-parse --show-toplevel )"

# Check Node.js version
REQUIRED_NODE_VERSION=$(cat "${ROOT_DIR}/backend/.nvmrc")
CURRENT_NODE_VERSION=$(node -v | grep -oE '[0-9]+' | head -1)

if [[ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]]; then
  echo "Node.js version must be >= $REQUIRED_NODE_VERSION. Current version is $(node -v). Exiting."
  exit 1
fi

# Check if ports 3000 and 3001 are in use
for PORT in 3000 3001; do
  if lsof -iTCP:$PORT -sTCP:LISTEN -t >/dev/null; then
    echo "Port $PORT is already in use! Exiting."
    exit 1
  fi
done

# Starts mocks + backend - runs headless e2e ui tests
export CONFIG_DIR="$( mktemp -d -t code-metrics-config-XXXXXX )"

MOCKS_DIR=${ROOT_DIR}/mocks
BACKEND_DIR=${ROOT_DIR}/backend
FRONTEND_DIR=${ROOT_DIR}/ui

function install_deps() {
  cd "${BACKEND_DIR}"
  echo "Installing backend dependencies..."
  npm config get cache && npm ci --verbose

  cd "${FRONTEND_DIR}"
  echo "Installing frontend dependencies..."
  npm config get cache && npm ci --verbose
}

function setup_db() {
  # always use inmem for tests
  export DATASTORE_IMPL="inmem"
  #  cd "${ROOT_DIR}/scripts"
  #  ./start_db.sh &
}

function start_mocks() {
  cd "${MOCKS_DIR}"
  imposter up -r &
  local MOCKS_HEALTHCHECK_URL="http://localhost:8080/system/status"

  echo "Waiting for mocks to come up on ${MOCKS_HEALTHCHECK_URL}..."
  while ! curl "${MOCKS_HEALTHCHECK_URL}" --fail &>/dev/null; do
      sleep 1
  done
  echo "Mocks are up and running!"
}

function start_backend() {
  cd "${BACKEND_DIR}"

  if [[ ! -f .env ]]; then
    echo "Copying .env from template"
    cp .env.template .env
  fi

  echo "Using config dir: ${CONFIG_DIR}"
  cp config/examples/remote-config.yaml "${CONFIG_DIR}/remote-config.yaml"
  cp config/examples/workload-config.yaml "${CONFIG_DIR}/workload-config.yaml"
  cp config/examples/users.json "${CONFIG_DIR}/users.json"
  cp config/examples/secrets.yaml.example "${CONFIG_DIR}/secrets.yaml"
  cp ${MOCKS_DIR}/config/pipeline-config.yaml "${CONFIG_DIR}/pipeline-config.yaml"
  cp ${MOCKS_DIR}/config/license.yaml "${CONFIG_DIR}/license.yaml"

  npm run dev &
  BACKEND_NPM_PID="$!"
  local BACKEND_READINESS_URL="http://localhost:3000/api/health/readiness"

  echo "Waiting for backend to come up on ${BACKEND_READINESS_URL}..."
  while ! curl "${BACKEND_READINESS_URL}" --fail &>/dev/null; do
      sleep 1
  done
  echo "Backend is up and running!"
}

function run_e2e_tests() {
  cd "${FRONTEND_DIR}"
  echo "Running e2e tests..."
  npm run test:e2e:headless
}

function stop_backend() {
  echo "Stopping backend"
  if [[ -n "$BACKEND_NPM_PID" ]]; then
    kill ${BACKEND_NPM_PID}
  fi
  lsof -nP -iTCP -sTCP:LISTEN | grep 3000 | awk '{ print $2 }' | xargs kill
}

function stop_mocks() {
  echo "Stopping mocks"
  imposter down
}

# Ensure stop_backend and stop_mocks are called on script exit even during failures
trap "stop_backend; stop_mocks" EXIT

if [[ $# -eq 0 || "$1" != "--skip-install" ]]; then
  install_deps
fi

setup_db
start_mocks
start_backend

run_e2e_tests
