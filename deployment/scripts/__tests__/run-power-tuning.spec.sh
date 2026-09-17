#!/usr/bin/env bash
# Positive and negative checks for run-power-tuning.sh and its payloads.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCRIPT="${SCRIPTS_DIR}/run-power-tuning.sh"
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

# Positive: help exits 0 and documents required options
HELP_OUT="$("${SCRIPT}" --help)"
if echo "${HELP_OUT}" | grep -q 'state-machine-arn' && echo "${HELP_OUT}" | grep -q 'strategy'; then
  echo "PASS: help documents required options"
else
  echo "FAIL: help documents required options" >&2
  FAILURES=$((FAILURES + 1))
fi

# Negative: missing required args / unknown option fails
assert_failure "missing both required args exits non-zero" "${SCRIPT}"
assert_failure "missing lambda-arn exits non-zero" "${SCRIPT}" --state-machine-arn "arn:aws:states:eu-west-2:123:stateMachine:x"
assert_failure "missing state-machine-arn exits non-zero" "${SCRIPT}" --lambda-arn "arn:aws:lambda:eu-west-2:123:function:x"
assert_failure "unknown option exits non-zero" "${SCRIPT}" --not-a-real-flag
assert_failure "invalid strategy exits non-zero" "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --strategy fastest
assert_failure "too few invocations exits non-zero" "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --num 4
assert_failure "non-numeric invocations exits non-zero" "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --num many
assert_failure "invalid balanced weight exits non-zero" "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --balanced-weight 2

CAPTURED_INPUT="$(mktemp)"
RESULT_FILE="$(mktemp)"
ACTIVE_CHECK_COUNT="$(mktemp)"
printf '0' > "$ACTIVE_CHECK_COUNT"
aws() {
  if [[ "$1 $2" == "stepfunctions list-executions" ]]; then
    local active_check_count
    active_check_count="$(cat "$ACTIVE_CHECK_COUNT")"
    printf '%s' "$((active_check_count + 1))" > "$ACTIVE_CHECK_COUNT"
    if [[ "${AWS_ACTIVE_TARGET:-}" == "always" || ("${AWS_ACTIVE_TARGET:-}" == "once" && "$active_check_count" == "0") ]]; then
      echo "arn:aws:states:eu-west-2:123:execution:active"
    else
      echo "None"
    fi
    return
  fi

  if [[ "$*" == *"execution:active"* && "$*" == *"--query input"* ]]; then
    echo '{"lambdaARN":"lambda"}'
    return
  fi

  if [[ "$1 $2" == "stepfunctions start-execution" ]]; then
    shift 2
    while [[ $# -gt 0 ]]; do
      if [[ "$1" == "--input" ]]; then
        printf '%s' "$2" > "$CAPTURED_INPUT"
        break
      fi
      shift
    done
    echo "arn:aws:states:eu-west-2:123:execution:test"
    return
  fi

  if [[ "$*" == *"--query status"* ]]; then
    echo "SUCCEEDED"
    return
  fi

  if [[ "$*" == *"--query output"* ]]; then
    echo "${AWS_TEST_OUTPUT:-{\"results\":{\"power\":\"512\",\"cost\":0.1,\"duration\":100,\"stateMachine\":{}}}}"
    return
  fi

  return 1
}
sleep() { :; }
export -f aws
export -f sleep
export CAPTURED_INPUT ACTIVE_CHECK_COUNT

"${SCRIPT}" \
  --state-machine-arn state-machine \
  --lambda-arn lambda \
  --num 5 \
  --payload '[{"payload":{"test":"light"},"weight":1},{"payload":{"test":"heavy"},"weight":1}]' \
  --strategy balanced \
  --balanced-weight 0.7 \
  --result-file "$RESULT_FILE" >/dev/null

assert_eq "state machine strategy" "balanced" "$(jq -r '.strategy' "$CAPTURED_INPUT")"
assert_eq "state machine balanced weight" "0.7" "$(jq -r '.balancedWeight' "$CAPTURED_INPUT")"
assert_eq "state machine weighted payload count" "2" "$(jq '.payload | length' "$CAPTURED_INPUT")"
assert_eq "default power values exclude timed-out 128 MB" "256,512,1024,2048,3008" "$(jq -r '.powerValues | join(",")' "$CAPTURED_INPUT")"
assert_eq "state machine payload logs disabled" "true" "$(jq -r '.disablePayloadLogs' "$CAPTURED_INPUT")"
assert_eq "documented result wrapper parsed" "512" "$(jq -r '.power' "$RESULT_FILE")"

printf '0' > "$ACTIVE_CHECK_COUNT"
export AWS_ACTIVE_TARGET=once
POWER_TUNING_POLL_INTERVAL=1 "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --num 5 \
  --result-file "$RESULT_FILE" >/dev/null
assert_eq "active target checked until complete" "2" "$(cat "$ACTIVE_CHECK_COUNT")"
unset AWS_ACTIVE_TARGET

printf '0' > "$ACTIVE_CHECK_COUNT"
export AWS_ACTIVE_TARGET=always
if POWER_TUNING_POLL_INTERVAL=1 POWER_TUNING_MAX_WAIT=1 "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --num 5 >/dev/null 2>&1; then
  echo "FAIL: active target timeout fails (expected non-zero exit)" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: active target timeout fails"
fi
unset AWS_ACTIVE_TARGET

rm -f "$CAPTURED_INPUT" "$RESULT_FILE" "$ACTIVE_CHECK_COUNT"

export AWS_TEST_OUTPUT='{"results":{"power":"512"}}'
assert_failure "unexpected result shape fails" "${SCRIPT}" \
  --state-machine-arn state-machine --lambda-arn lambda --num 5
unset AWS_TEST_OUTPUT

# Positive: payloads are valid JSON with expected shape
if jq -e . "${SCRIPTS_DIR}/power-tuning-payload-mocks.json" >/dev/null; then
  echo "PASS: mocks payload is valid JSON"
else
  echo "FAIL: mocks payload is valid JSON" >&2
  FAILURES=$((FAILURES + 1))
fi
assert_eq "mocks payload rawPath" "/api/measures/search_history" "$(jq -r '.rawPath' "${SCRIPTS_DIR}/power-tuning-payload-mocks.json")"

if [[ "${FAILURES}" -ne 0 ]]; then
  echo "${FAILURES} test(s) failed" >&2
  exit 1
fi

echo "All run-power-tuning tests passed"
