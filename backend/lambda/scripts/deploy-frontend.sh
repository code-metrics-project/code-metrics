set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
UI_BUCKET="codemetrics-staging"
UI_ARCHIVE_FILENAME="codemetrics-ui.zip"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  source "${SCRIPT_DIR}/.env"
fi

echo "Staging frontend from ${CODEMETRICS_DISTRO_DIR}"

STAGING_DIR="$( mktemp -d )"
cp "${CODEMETRICS_DISTRO_DIR}/${UI_ARCHIVE_FILENAME}" "${STAGING_DIR}"
pushd "${STAGING_DIR}"
unzip "${UI_ARCHIVE_FILENAME}" -d codemetrics-ui

if [[ -f .env ]]; then
  rm .env
fi

echo "Copying config"
cp -r "${SCRIPT_DIR}/config.json" "${STAGING_DIR}/codemetrics-ui/config.json"

echo "Deploying frontend"
pushd codemetrics-ui
aws s3 sync . "s3://${UI_BUCKET}" --delete
