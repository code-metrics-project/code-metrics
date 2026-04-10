#!/usr/bin/env bash
set -e

ROOT_DIR="$( git rev-parse --show-toplevel )"

if [[ $# -lt 1 ]]; then
  echo "Missing version. Usage $( basename "$0" ) <version>"
  exit 1
fi

cd "${ROOT_DIR}/deployment/helm"
mkdir -p dist

CVERSION="$1"
if ! [[ "${CVERSION}" =~ [[:digit:]]+.[[:digit:]]+.[[:digit:]]+ ]]; then
  CVERSION="0.0.0"
  echo "Treating version ${CVERSION} as dev version"
fi

MLAPIVERSION=$(cd ${ROOT_DIR}/machinelearning && cat pyproject.toml | grep ^version | cut -f2 -d'"')
APIVERSION=$(cd ${ROOT_DIR}/backend && npm pkg get version | sed 's/"//g')
UIVERSION=$(cd ${ROOT_DIR}/ui && npm pkg get version | sed 's/"//g')
sed -i -e "s/version: 0.1.0/version: ${CVERSION}/" -e "s/appVersion: \"0.1.0\"/version: \"${MLAPIVERSION}\"/" code-metrics/charts/code-metrics-mlapi/Chart.yaml
sed -i -e "s/version: 0.1.0/version: ${CVERSION}/" -e "s/appVersion: \"0.1.0\"/version: \"${APIVERSION}\"/" code-metrics/charts/code-metrics-api/Chart.yaml
sed -i -e "s/version: 0.1.0/version: ${CVERSION}/" -e "s/appVersion: \"0.1.0\"/version: \"${UIVERSION}\"/" code-metrics/charts/code-metrics-ui/Chart.yaml
# Demo Charts
sed -i -e "s/version: 0.1.0/version: ${CVERSION}/" -e "s/appVersion: \"0.1.0\"/version: \"${APIVERSION}\"/" code-metrics-demo/charts/jenkins/Chart.yaml
sed -i -e "s/version: 0.1.0/version: ${CVERSION}/" -e "s/appVersion: \"0.1.0\"/version: \"${APIVERSION}\"/" code-metrics-demo/charts/mock-api/Chart.yaml

echo -e "\nChart version: ${CVERSION}\nAPI version: ${APIVERSION}\nUI version: ${UIVERSION}\nMLAPI version: ${MLAPIVERSION}"

helm package code-metrics -u -d dist/ --version "${CVERSION}" --app-version "${APIVERSION}"
helm package code-metrics-demo -u -d dist/ --version "${CVERSION}" --app-version "${APIVERSION}"
