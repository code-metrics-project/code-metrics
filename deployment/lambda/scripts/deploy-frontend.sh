set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
FRONTEND_ARCHIVE_FILENAME="codemetrics-frontend.zip"
LEGACY_UI_ARCHIVE_FILENAME="codemetrics-ui.zip"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  source "${SCRIPT_DIR}/.env"
fi

if [[ -z "${UI_BUCKET}" ]]; then
  echo "Error: UI_BUCKET is not set"
  exit 1
fi

echo "Staging frontend from ${CODEMETRICS_DISTRO_DIR}"

STAGING_DIR="$( mktemp -d )"
if [[ -f "${CODEMETRICS_DISTRO_DIR}/${FRONTEND_ARCHIVE_FILENAME}" ]]; then
  ARCHIVE_FILENAME="${FRONTEND_ARCHIVE_FILENAME}"
  EXTRACT_DIR="codemetrics-frontend"
else
  ARCHIVE_FILENAME="${LEGACY_UI_ARCHIVE_FILENAME}"
  EXTRACT_DIR="codemetrics-ui"
fi

cp "${CODEMETRICS_DISTRO_DIR}/${ARCHIVE_FILENAME}" "${STAGING_DIR}"
pushd "${STAGING_DIR}"
unzip "${ARCHIVE_FILENAME}" -d "${EXTRACT_DIR}"

if [[ -f .env ]]; then
  rm .env
fi

echo "Copying config"
cp -r "${SCRIPT_DIR}/config.json" "${STAGING_DIR}/${EXTRACT_DIR}/config.json"

echo "Deploying frontend"
pushd "${EXTRACT_DIR}"
aws s3 sync . "s3://${UI_BUCKET}" --delete
