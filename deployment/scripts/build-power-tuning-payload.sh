#!/usr/bin/env bash
set -euo pipefail

MODE=""
START_DATE=""
END_DATE=""

usage() {
  cat <<EOF
Usage: $(basename "$0") --mode MODE [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]

Build weighted light and heavy CodeMetrics query payloads for Lambda Power Tuning.

Options:
  --mode MODE              api, query-consumer, or queries (required)
  --start-date YYYY-MM-DD  Query start date (default: seven days ago)
  --end-date YYYY-MM-DD    Query end date (default: today)
  -h, --help               Show this help

API mode reads the authentication token from POWER_TUNING_ACCESS_TOKEN.
EOF
}

date_days_ago() {
  local days="$1"
  if date -u -d "${days} days ago" +%F >/dev/null 2>&1; then
    date -u -d "${days} days ago" +%F
  else
    date -u -v-"${days}"d +%F
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --start-date) START_DATE="${2:-}"; shift 2 ;;
    --end-date) END_DATE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

START_DATE="${START_DATE:-$(date_days_ago 7)}"
END_DATE="${END_DATE:-$(date_days_ago 0)}"

if [[ ! "$START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || [[ ! "$END_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Dates must use YYYY-MM-DD format" >&2
  exit 1
fi

LIGHT_QUERY=$(jq -n \
  --arg start_date "$START_DATE" \
  --arg end_date "$END_DATE" \
  '{queryName: "pr-size", args: {workloads: ["gaia"], repoGroups: [], startDate: $start_date, endDate: $end_date}}')
HEAVY_QUERY=$(jq -n \
  --arg start_date "$START_DATE" \
  --arg end_date "$END_DATE" \
  '{queryName: "pr-open-time", args: {workloads: ["athena"], repoGroups: [], startDate: $start_date, endDate: $end_date}}')

build_api_event() {
  local query="$1"
  jq -n \
    --arg token "$POWER_TUNING_ACCESS_TOKEN" \
    --argjson query "$query" \
    '{
      version: "2.0",
      routeKey: "POST /api/{proxy+}",
      rawPath: "/api/query",
      rawQueryString: "",
      headers: {
        authorization: ("Bearer " + $token),
        "content-type": "application/json"
      },
      requestContext: {
        http: {
          method: "POST",
          path: "/api/query",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "lambda-power-tuning"
        },
        requestId: "lambda-power-tuning"
      },
      body: ($query | tojson),
      isBase64Encoded: false
    }'
}

build_sqs_event() {
  local job_id="$1"
  local query="$2"
  jq -n \
    --arg job_id "$job_id" \
    --argjson query "$query" \
    '{
      Records: [{
        messageId: $job_id,
        receiptHandle: "lambda-power-tuning",
        body: ({jobId: $job_id, query: $query} | tojson),
        attributes: {},
        messageAttributes: {},
        md5OfBody: "lambda-power-tuning",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:eu-west-2:000000000000:lambda-power-tuning",
        awsRegion: "eu-west-2"
      }]
    }'
}

case "$MODE" in
  queries)
    LIGHT_PAYLOAD="$LIGHT_QUERY"
    HEAVY_PAYLOAD="$HEAVY_QUERY"
    ;;
  api)
    if [[ -z "${POWER_TUNING_ACCESS_TOKEN:-}" ]]; then
      echo "POWER_TUNING_ACCESS_TOKEN is required for API payloads" >&2
      exit 1
    fi
    LIGHT_PAYLOAD=$(build_api_event "$LIGHT_QUERY")
    HEAVY_PAYLOAD=$(build_api_event "$HEAVY_QUERY")
    ;;
  query-consumer)
    LIGHT_PAYLOAD=$(build_sqs_event "lambda-power-tuning-light" "$LIGHT_QUERY")
    HEAVY_PAYLOAD=$(build_sqs_event "lambda-power-tuning-heavy" "$HEAVY_QUERY")
    ;;
  *)
    echo "Unsupported payload mode: '$MODE'" >&2
    exit 1
    ;;
esac

jq -n \
  --argjson light "$LIGHT_PAYLOAD" \
  --argjson heavy "$HEAVY_PAYLOAD" \
  '[{payload: $light, weight: 1}, {payload: $heavy, weight: 1}]'