#!/usr/bin/env bash
set -e

#
# Runs all flavours of tests:
# - unit tests
# - integration tests
# - end-to-end tests
#

ROOT_DIR="$( git rev-parse --show-toplevel )"

pushd "${ROOT_DIR}/backend"
npm ci
npm run test
npm run test:integration
npm run test:slow
popd

pushd "${ROOT_DIR}/frontend"
npm ci
npm run test:unit
popd

"${ROOT_DIR}/scripts/validate-test_e2e_mocks.sh" --auth-mode file --skip-install
