#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$(cd "${SCRIPT_DIR}/.." && pwd)/run-async-query-load-test.sh"
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

curl() {
  local output_file=""
  local method="GET"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --output) output_file="$2"; shift 2 ;;
      --request) method="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [[ "$method" == "POST" ]]; then
    printf '{"jobId":"job-1","pollUrl":"/api/query/async/job-1"}' > "$output_file"
    printf '202'
  else
    printf '{"result":{}}' > "$output_file"
    printf '200'
  fi
}
export -f curl

RESULT_FILE=$(mktemp)
POWER_TUNING_ACCESS_TOKEN="test-token" "$SCRIPT" \
  --base-url https://example.test \
  --iterations 1 \
  --poll-timeout 1 \
  --poll-interval 0 \
  --result-file "$RESULT_FILE" >/dev/null

assert_eq "result count" "2" "$(wc -l < "$RESULT_FILE" | tr -d ' ')"
assert_eq "light result" "pr-size" "$(sed -n '1p' "$RESULT_FILE" | jq -r '.queryName')"
assert_eq "heavy result" "pr-open-time" "$(sed -n '2p' "$RESULT_FILE" | jq -r '.queryName')"
assert_eq "duration is numeric" "true" "$(jq -s 'all(.[]; .durationMs >= 0)' "$RESULT_FILE")"
rm -f "$RESULT_FILE"

assert_failure "missing URL fails" env POWER_TUNING_ACCESS_TOKEN=test-token "$SCRIPT"
assert_failure "invalid iterations fail" env POWER_TUNING_ACCESS_TOKEN=test-token "$SCRIPT" \
  --base-url https://example.test --iterations 0
assert_failure "missing token fails" env -u POWER_TUNING_ACCESS_TOKEN "$SCRIPT" \
  --base-url https://example.test
assert_failure "unknown option fails" "$SCRIPT" --wat

if [[ "$FAILURES" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All run-async-query-load-test tests passed"