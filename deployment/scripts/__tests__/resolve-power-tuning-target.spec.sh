#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$(cd "${SCRIPT_DIR}/.." && pwd)/resolve-power-tuning-target.sh"
FAILURES=0

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "FAIL: ${label} (expected '${expected}', got '${actual}')" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: ${label}"
  fi
}

assert_failure() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL: ${label} (expected non-zero exit)" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: ${label}"
  fi
}

BACKEND="$(${SCRIPT} --environment demo-eu --target backend)"
assert_eq "backend stack" "CodeMetrics-demo-eu-Backend" "$(jq -r '.stack_name' <<<"$BACKEND")"
assert_eq "backend output" "BackendLambdaName" "$(jq -r '.output_key' <<<"$BACKEND")"

QUERY="$(${SCRIPT} --environment demo-eu --target backend-query)"
assert_eq "query stack" "CodeMetrics-demo-eu-Backend" "$(jq -r '.stack_name' <<<"$QUERY")"
assert_eq "query output" "QueryProcessingLambdaName" "$(jq -r '.output_key' <<<"$QUERY")"

BACKEND_URL="$(${SCRIPT} --environment demo-eu --target backend-url)"
assert_eq "backend URL stack" "CodeMetrics-demo-eu-Frontend" "$(jq -r '.stack_name' <<<"$BACKEND_URL")"
assert_eq "backend URL output" "apiBaseUrl" "$(jq -r '.output_key' <<<"$BACKEND_URL")"

MOCKS="$(${SCRIPT} --environment dev --target mocks)"
assert_eq "mocks stack" "CodeMetricsMock-dev" "$(jq -r '.stack_name' <<<"$MOCKS")"
assert_eq "mocks output" "MockLambdaName" "$(jq -r '.output_key' <<<"$MOCKS")"

assert_failure "missing environment fails" "${SCRIPT}" --target backend
assert_failure "upper-case environment fails" "${SCRIPT}" --environment Demo --target backend
assert_failure "malformed environment fails" "${SCRIPT}" --environment demo_env --target backend
assert_failure "production environment fails" "${SCRIPT}" --environment prod --target backend
assert_failure "unsupported target fails" "${SCRIPT}" --environment dev --target unknown
assert_failure "unknown option fails" "${SCRIPT}" --wat

if [[ "$FAILURES" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All resolve-power-tuning-target tests passed"