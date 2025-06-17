#!/usr/bin/env bash
set -e

ROOT_DIR="$( git rev-parse --show-toplevel )"
DOCS_SITE_REPO="$( cd "${ROOT_DIR}/.." && pwd )/code-metrics-docs"

CONFIRM_UPDATE=

while getopts "y" opt; do
  case ${opt} in
    y )
      CONFIRM_UPDATE="y"
      ;;
    \? )
      echo "Invalid option: $OPTARG" 1>&2
      ;;
    : )
      echo "Invalid option: $OPTARG requires an argument" 1>&2
      ;;
  esac
done
shift $((OPTIND -1))

cd "${ROOT_DIR}"

if [[ ! -d "${DOCS_SITE_REPO}" ]]; then
  echo "Docs site repo does not exist at: ${DOCS_SITE_REPO}"
  exit 1
fi

if [[ -z "$CONFIRM_UPDATE" ]]; then
  echo "Replace docs in site repo at: ${DOCS_SITE_REPO} (y/N)?"
  read -r CONFIRM_UPDATE
fi
if [[ -z "$CONFIRM_UPDATE" || "y" != "$CONFIRM_UPDATE" ]]; then
  echo "Aborted"
  exit 1
fi

DEST_DIR="${DOCS_SITE_REPO}/src"
if [[ -d "${DEST_DIR}" ]]; then
  rm -rf "${DEST_DIR}"
  mkdir -p "${DEST_DIR}"
fi

cp -r docs mkdocs.yml "${DEST_DIR}"

ls -l "${DEST_DIR}/docs"
echo "Copied docs to site repo at: ${DEST_DIR}"
