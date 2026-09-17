#!/usr/bin/env bash
# Positive and negative checks for downstream rsync excludes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXCLUDES_FILE="${SCRIPT_DIR}/../rsync-excludes.txt"
UPDATE_SCRIPT="${SCRIPT_DIR}/../update-downstream-fork.sh"
FAILURES=0

assert_contains() {
  local label="$1" pattern="$2"
  if grep -qxF "$pattern" "$EXCLUDES_FILE"; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label} (expected exact line '${pattern}')" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

assert_file_exists() {
  if [[ -f "$EXCLUDES_FILE" ]]; then
    echo "PASS: excludes file exists"
  else
    echo "FAIL: excludes file exists" >&2
    exit 1
  fi
}

assert_file_exists
assert_contains "excludes deploy-demo workflow" ".github/workflows/deploy-demo.yaml"
assert_contains "excludes destroy-demo workflow" ".github/workflows/destroy-demo.yaml"
assert_contains "excludes demo-config overlays" ".github/demo-config/"
assert_contains "excludes machinelearning" "machinelearning/"
assert_contains "excludes promosite" "promosite/"

if ! grep -q 'rsync-excludes.txt' "${UPDATE_SCRIPT}"; then
  echo "FAIL: update-downstream-fork.sh should reference rsync-excludes.txt" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: update-downstream-fork.sh references rsync-excludes.txt"
fi

if [[ "${FAILURES}" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All downstream exclude tests passed"
