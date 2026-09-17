#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL=""
ITERATIONS=3
POLL_TIMEOUT=120
POLL_INTERVAL=1
RESULT_FILE="/tmp/async-query-load-test.jsonl"

usage() {
  cat <<EOF
Usage: $(basename "$0") --base-url URL [OPTIONS]

Measure end-to-end latency through the CodeMetrics async query API.

Options:
  --base-url URL          CodeMetrics API base URL (required)
  --iterations N          Runs per query workload (default: 3)
  --poll-timeout SECONDS  Maximum wait for each job (default: 120)
  --poll-interval SECONDS Delay between polls (default: 1)
  --result-file PATH      JSON Lines output path (default: /tmp/async-query-load-test.jsonl)
  -h, --help              Show this help

The authentication token is read from POWER_TUNING_ACCESS_TOKEN.
EOF
}

now_ms() {
  node -e 'process.stdout.write(String(Date.now()))'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="${2:-}"; shift 2 ;;
    --iterations) ITERATIONS="${2:-}"; shift 2 ;;
    --poll-timeout) POLL_TIMEOUT="${2:-}"; shift 2 ;;
    --poll-interval) POLL_INTERVAL="${2:-}"; shift 2 ;;
    --result-file) RESULT_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
  echo "Error: --base-url must be an HTTP or HTTPS URL" >&2
  exit 1
fi
if [[ ! "$ITERATIONS" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: --iterations must be a positive integer" >&2
  exit 1
fi
if [[ ! "$POLL_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || [[ ! "$POLL_INTERVAL" =~ ^[0-9]+$ ]]; then
  echo "Error: polling values must be non-negative integers and timeout must be positive" >&2
  exit 1
fi
if [[ -z "${POWER_TUNING_ACCESS_TOKEN:-}" ]]; then
  echo "Error: POWER_TUNING_ACCESS_TOKEN is required" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
PAYLOADS=$("${SCRIPT_DIR}/build-power-tuning-payload.sh" --mode queries)
: > "$RESULT_FILE"

for payload_index in 0 1; do
  QUERY=$(jq -c ".[$payload_index].payload" <<<"$PAYLOADS")
  QUERY_NAME=$(jq -r '.queryName' <<<"$QUERY")

  for iteration in $(seq 1 "$ITERATIONS"); do
    RESPONSE_FILE=$(mktemp)
    START_MS=$(now_ms)
    HTTP_STATUS=$(curl --silent --show-error \
      --output "$RESPONSE_FILE" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Authorization: Bearer ${POWER_TUNING_ACCESS_TOKEN}" \
      --header 'Content-Type: application/json' \
      --data "$QUERY" \
      "${BASE_URL}/api/query/async")

    if [[ "$HTTP_STATUS" != "202" ]]; then
      echo "Async query submission failed for $QUERY_NAME with HTTP $HTTP_STATUS" >&2
      cat "$RESPONSE_FILE" >&2
      rm -f "$RESPONSE_FILE"
      exit 1
    fi

    POLL_URL=$(jq -r '.pollUrl // empty' "$RESPONSE_FILE")
    rm -f "$RESPONSE_FILE"
    if [[ -z "$POLL_URL" ]]; then
      echo "Async query submission returned no pollUrl for $QUERY_NAME" >&2
      exit 1
    fi
    if [[ "$POLL_URL" != http://* && "$POLL_URL" != https://* ]]; then
      POLL_URL="${BASE_URL}${POLL_URL}"
    fi

    DEADLINE_MS=$((START_MS + POLL_TIMEOUT * 1000))
    CURRENT_POLL_INTERVAL="$POLL_INTERVAL"
    while true; do
      RESPONSE_FILE=$(mktemp)
      HTTP_STATUS=$(curl --silent --show-error \
        --output "$RESPONSE_FILE" \
        --write-out '%{http_code}' \
        --header "Authorization: Bearer ${POWER_TUNING_ACCESS_TOKEN}" \
        "$POLL_URL")

      if [[ "$HTTP_STATUS" == "200" ]]; then
        END_MS=$(now_ms)
        DURATION_MS=$((END_MS - START_MS))
        jq -n -c \
          --arg query_name "$QUERY_NAME" \
          --argjson iteration "$iteration" \
          --argjson duration_ms "$DURATION_MS" \
          '{queryName: $query_name, iteration: $iteration, durationMs: $duration_ms}' >> "$RESULT_FILE"
        echo "$QUERY_NAME run $iteration completed in ${DURATION_MS}ms"
        rm -f "$RESPONSE_FILE"
        break
      fi

      rm -f "$RESPONSE_FILE"
      if [[ "$HTTP_STATUS" != "202" ]]; then
        echo "Async query polling failed for $QUERY_NAME with HTTP $HTTP_STATUS" >&2
        exit 1
      fi
      if [[ "$(now_ms)" -ge "$DEADLINE_MS" ]]; then
        echo "Async query timed out for $QUERY_NAME after ${POLL_TIMEOUT}s" >&2
        exit 1
      fi
      if [[ "$CURRENT_POLL_INTERVAL" -gt 0 ]]; then
        sleep "$CURRENT_POLL_INTERVAL"
        CURRENT_POLL_INTERVAL=$((CURRENT_POLL_INTERVAL * 2))
        if [[ "$CURRENT_POLL_INTERVAL" -gt 5 ]]; then
          CURRENT_POLL_INTERVAL=5
        fi
      fi
    done
  done
done