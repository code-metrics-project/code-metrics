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

REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
CHANGE_CONFIG="${REPO_ROOT}/.github/change_detection_config.json"
CI_WORKFLOW="${REPO_ROOT}/.github/workflows/ci.yaml"

# Every path behind the demo CI flag must be left out of the downstream sync,
# otherwise downstream CI skips checks for files it actually has.
while IFS= read -r demo_path; do
  if grep -qxF "${demo_path}" "$EXCLUDES_FILE" || grep -qxF "${demo_path}/" "$EXCLUDES_FILE"; then
    echo "PASS: demo path '${demo_path}' is excluded from downstream"
  else
    echo "FAIL: demo path '${demo_path}' is in change_detection_config.json but not in rsync-excludes.txt" >&2
    FAILURES=$((FAILURES + 1))
  fi
done < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["service_dirs"]["demo"]))' "${CHANGE_CONFIG}")

# Downstream CI must turn off jobs that read the excluded demo files.
if grep -qE -- '--set demo=false' "${CI_WORKFLOW}"; then
  echo "PASS: ci.yaml disables demo checks outside the upstream repo"
else
  echo "FAIL: ci.yaml should pass '--set demo=false' for downstream repos" >&2
  FAILURES=$((FAILURES + 1))
fi

if [[ "${FAILURES}" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All downstream exclude tests passed"
