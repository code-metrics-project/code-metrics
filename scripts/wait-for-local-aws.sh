#!/bin/bash

set -euo pipefail

AWS_ENDPOINT_URL="${1:-${AWS_ENDPOINT_URL:-http://localhost:4566}}"
TIMEOUT_SECONDS="${2:-60}"
WAIT_SECONDS=0

check_health() {
  local endpoint=$1
  curl -fsS "${endpoint}/_localstack/health" >/dev/null 2>&1 \
    || curl -fsS "${endpoint}/_ministack/health" >/dev/null 2>&1
}

echo "Waiting for local AWS emulator at ${AWS_ENDPOINT_URL}..."

until check_health "$AWS_ENDPOINT_URL"; do
  sleep 2
  WAIT_SECONDS=$((WAIT_SECONDS + 2))

  if [ "$WAIT_SECONDS" -ge "$TIMEOUT_SECONDS" ]; then
    echo "Timed out waiting for local AWS emulator after ${TIMEOUT_SECONDS}s" >&2
    exit 1
  fi
done

echo "Local AWS emulator is ready"