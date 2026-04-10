#!/usr/bin/env bash
set -e

ROOT_DIR="$( git rev-parse --show-toplevel )"
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
OUTPUT_DIR="${SCRIPT_DIR}/dist"
STAGING_DIR="$( mktemp -d )"

# can be 'dev' or 'prod'
RELEASE_TYPE="${1:-dev}"

cd "${ROOT_DIR}/backend"
npm run "release:${RELEASE_TYPE}"

mkdir -p "${STAGING_DIR}"
cp -r dist/* "${STAGING_DIR}"
if [[ "${RELEASE_TYPE}" == "dev" ]]; then
  cp -r mocks/config "${STAGING_DIR}"
  cp mocks/config/.mockenv "${STAGING_DIR}/config/.env"
fi

#mkdir -p "${OUTPUT_DIR}"
# cd "${STAGING_DIR}"
# DEST_FILE="${OUTPUT_DIR}/codemetrics-lambda.zip"
# zip -r "${DEST_FILE}" .

if [[ -d "${OUTPUT_DIR}" ]]; then
  rm -rf "${OUTPUT_DIR}"
fi
mv "${STAGING_DIR}" "${OUTPUT_DIR}"

echo "Lambda built to ${OUTPUT_DIR}"
