#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=""
TARGET=""

usage() {
  cat <<EOF
Usage: $(basename "$0") --environment SLUG --target TARGET

Resolve a CodeMetrics Lambda Power Tuning target.

Options:
  --environment SLUG  Non-production environment slug (required)
  --target TARGET     backend-api, backend-query, backend-url, backend, or mocks (required)
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment) ENVIRONMENT="${2:-}"; shift 2 ;;
    --target) TARGET="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! "$ENVIRONMENT" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Invalid environment slug: '$ENVIRONMENT'" >&2
  exit 1
fi

if [[ "$ENVIRONMENT" == "prod" ]]; then
  echo "Production tuning is not supported; use a dedicated non-production environment" >&2
  exit 1
fi

case "$TARGET" in
  backend-api|backend)
    STACK_NAME="CodeMetrics-${ENVIRONMENT}-Backend"
    OUTPUT_KEY="BackendLambdaName"
    ;;
  backend-query)
    STACK_NAME="CodeMetrics-${ENVIRONMENT}-Backend"
    OUTPUT_KEY="QueryProcessingLambdaName"
    ;;
  backend-url)
    STACK_NAME="CodeMetrics-${ENVIRONMENT}-Frontend"
    OUTPUT_KEY="apiBaseUrl"
    ;;
  mocks)
    STACK_NAME="CodeMetricsMock-${ENVIRONMENT}"
    OUTPUT_KEY="MockLambdaName"
    ;;
  *)
    echo "Unsupported tuning target: '$TARGET'" >&2
    exit 1
    ;;
esac

jq -n --arg stack_name "$STACK_NAME" --arg output_key "$OUTPUT_KEY" \
  '{stack_name: $stack_name, output_key: $output_key}'