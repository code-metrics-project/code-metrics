#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$(cd "${SCRIPT_DIR}/.." && pwd)/build-power-tuning-payload.sh"
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

API_PAYLOAD=$(POWER_TUNING_ACCESS_TOKEN="test-token" "$SCRIPT" \
  --mode api --start-date 2026-09-03 --end-date 2026-09-10)
assert_eq "API payload count" "2" "$(jq 'length' <<<"$API_PAYLOAD")"
assert_eq "API light query" "pr-size" "$(jq -r '.[0].payload.body | fromjson | .queryName' <<<"$API_PAYLOAD")"
assert_eq "API heavy query" "pr-open-time" "$(jq -r '.[1].payload.body | fromjson | .queryName' <<<"$API_PAYLOAD")"
assert_eq "API authorization" "Bearer test-token" "$(jq -r '.[0].payload.headers.authorization' <<<"$API_PAYLOAD")"
assert_eq "API start date" "2026-09-03" "$(jq -r '.[1].payload.body | fromjson | .args.startDate' <<<"$API_PAYLOAD")"

QUERY_PAYLOAD=$("$SCRIPT" --mode query-consumer --start-date 2026-09-03 --end-date 2026-09-10)
assert_eq "query payload count" "2" "$(jq 'length' <<<"$QUERY_PAYLOAD")"
assert_eq "query light workload" "gaia" "$(jq -r '.[0].payload.Records[0].body | fromjson | .query.args.workloads[0]' <<<"$QUERY_PAYLOAD")"
assert_eq "query heavy workload" "athena" "$(jq -r '.[1].payload.Records[0].body | fromjson | .query.args.workloads[0]' <<<"$QUERY_PAYLOAD")"

RAW_QUERIES=$("$SCRIPT" --mode queries --start-date 2026-09-03 --end-date 2026-09-10)
assert_eq "raw light query" "pr-size" "$(jq -r '.[0].payload.queryName' <<<"$RAW_QUERIES")"
assert_eq "raw heavy query" "pr-open-time" "$(jq -r '.[1].payload.queryName' <<<"$RAW_QUERIES")"

assert_failure "missing API token fails" env -u POWER_TUNING_ACCESS_TOKEN "$SCRIPT" --mode api
assert_failure "invalid mode fails" "$SCRIPT" --mode unknown
assert_failure "invalid date fails" "$SCRIPT" --mode query-consumer --start-date 09-03-2026
assert_failure "unknown option fails" "$SCRIPT" --wat

if [[ "$FAILURES" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All build-power-tuning-payload tests passed"