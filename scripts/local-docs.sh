#!/usr/bin/env bash
set -e

ROOT_DIR="$( git rev-parse --show-toplevel )"

STAGING_DIR="$( mktemp -d -t code-metrics-docs-XXXXXX )"

cp "${ROOT_DIR}/docker/Dockerfile.docs" \
 "${ROOT_DIR}/mkdocs.yml"\
 "${STAGING_DIR}"

cd "${STAGING_DIR}"

docker build --file "${ROOT_DIR}/docker/Dockerfile.docs" --tag codemetrics/docs .
docker run --rm -it -v "${ROOT_DIR}/docs:/docs/docs" -p 8000:8000 codemetrics/docs
