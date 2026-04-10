#!/usr/bin/env bash
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

ARCHIVE_NAMES=(
  codemetrics-api.zip
  codemetrics-ui.zip
  codemetrics-frontend.zip
)

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  source "${SCRIPT_DIR}/.env"
fi

if [[ -z "${CODEMETRICS_PROJECT_DIR}" ]]; then
  echo "Error: CODEMETRICS_PROJECT_DIR is not set"
  exit 1
fi

if [[ -z "${CODEMETRICS_DISTRO_DIR}" ]]; then
  echo "Error: CODEMETRICS_DISTRO_DIR is not set"
  exit 1
fi

function clean_distro_dir() {
  mkdir -p "${CODEMETRICS_DISTRO_DIR}"
  pushd "${CODEMETRICS_DISTRO_DIR}"
  for DISTRO_ARCHIVE in "${ARCHIVE_NAMES[@]}"; do
    [[ -f "${DISTRO_ARCHIVE}" ]] && rm "${DISTRO_ARCHIVE}"
  done
  popd
}

function fetch_distros() {
  local DISTRO_VERSION="$1"
  echo "Fetching distros for version ${DISTRO_VERSION}"

  for DISTRO_ARCHIVE in "${ARCHIVE_NAMES[@]}"; do
    local DISTRO_URL="https://github.com/code-metrics-project/releases/releases/download/${DISTRO_VERSION}/${DISTRO_ARCHIVE}"
    echo -e "\nDownloading ${DISTRO_URL}"
    curl --fail -L -o "${CODEMETRICS_DISTRO_DIR}/${DISTRO_ARCHIVE}" "${DISTRO_URL}"
  done

  echo -e "\nDownloaded distros for version ${DISTRO_VERSION} to ${CODEMETRICS_DISTRO_DIR}"
}

function build_distros() {
  echo "Building distros to ${CODEMETRICS_DISTRO_DIR}"
  cd "${CODEMETRICS_PROJECT_DIR}"

  echo -e "\nBuilding backend"
  mkdir -p backend/dist && pushd backend/dist
  npm ci
  npm run build
  zip -r "${CODEMETRICS_DISTRO_DIR}/codemetrics-api.zip" .
  popd

  echo -e "\nBuilding frontend"
  pushd frontend
  bun install --frozen-lockfile
  bun run build
  pushd dist
  zip -r "${CODEMETRICS_DISTRO_DIR}/codemetrics-frontend.zip" .
  popd
  popd

  echo -e "\nBuilding legacy UI"
  mkdir -p ui/dist && pushd ui
  npm ci
  npm run build
  pushd dist
  zip -r "${CODEMETRICS_DISTRO_DIR}/codemetrics-ui.zip" .
  popd
  popd

  echo -e "\nBuilt distros to ${CODEMETRICS_DISTRO_DIR}"
}

if [[ 1 -ne $# ]]; then
  echo "Must specify version number to fetch or 'build' to build from source."
  exit 1
fi

case $1 in
build)
  clean_distro_dir
  build_distros
  ;;

* )
  clean_distro_dir
  fetch_distros "$1"
  ;;
esac
