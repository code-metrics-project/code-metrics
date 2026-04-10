set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
API_ARCHIVE_FILENAME="codemetrics-api.zip"

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  source "${SCRIPT_DIR}/.env"
fi

echo "Staging backend from ${CODEMETRICS_DISTRO_DIR}"

STAGING_DIR="$( mktemp -d )"
cp "${CODEMETRICS_DISTRO_DIR}/${API_ARCHIVE_FILENAME}" "${STAGING_DIR}"
pushd "${STAGING_DIR}"
unzip "${API_ARCHIVE_FILENAME}" -d codemetrics-api

if [[ -f .env ]]; then
  rm .env
fi

echo "Copying infrastructure config"
cp "${SCRIPT_DIR}/../infra/samconfig.toml" \
   "${SCRIPT_DIR}/../infra/template.yaml" \
   "${STAGING_DIR}"

echo "Copying API config"
CONFIG_STAGING_DIR="${STAGING_DIR}/codemetrics-api/config"
if [ -d "${CONFIG_STAGING_DIR}" ]; then
    rm -rf "${CONFIG_STAGING_DIR}"
fi
cp -r "${SCRIPT_DIR}/config" "${CONFIG_STAGING_DIR}"

echo "Deploying backend"
sam deploy
