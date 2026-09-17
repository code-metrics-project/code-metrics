#!/usr/bin/env bash
set -euo pipefail

STATE_MACHINE_ARN=""
LAMBDA_ARN=""
POWER_VALUES="256,512,1024,2048,3008"
NUM_INVOCATIONS=10
PAYLOAD="{}"
RESULT_FILE="/tmp/power-tuning-result.json"
STRATEGY="balanced"
BALANCED_WEIGHT="0.5"
POLL_INTERVAL="${POWER_TUNING_POLL_INTERVAL:-15}"
MAX_WAIT="${POWER_TUNING_MAX_WAIT:-600}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Run AWS Lambda Power Tuning against a Lambda function.

Options:
  --state-machine-arn ARN   Step Functions state machine ARN (required)
  --lambda-arn ARN          Lambda function ARN to tune (required)
  --power-values VALUES     Comma-separated memory sizes in MB (default: 256,512,1024,2048,3008)
  --num N                   Invocations per power config, minimum 5 (default: 10)
  --payload JSON            JSON payload for invocations (default: {})
  --strategy STRATEGY       cost, speed, or balanced (default: balanced)
  --balanced-weight NUMBER  Cost weighting from 0 to 1 (default: 0.5)
  --result-file PATH        Output file for results (default: /tmp/power-tuning-result.json)
  -h, --help                Show this help
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --state-machine-arn) STATE_MACHINE_ARN="$2"; shift 2 ;;
    --lambda-arn) LAMBDA_ARN="$2"; shift 2 ;;
    --power-values) POWER_VALUES="$2"; shift 2 ;;
    --num) NUM_INVOCATIONS="$2"; shift 2 ;;
    --payload) PAYLOAD="$2"; shift 2 ;;
    --strategy) STRATEGY="$2"; shift 2 ;;
    --balanced-weight) BALANCED_WEIGHT="$2"; shift 2 ;;
    --result-file) RESULT_FILE="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$STATE_MACHINE_ARN" || -z "$LAMBDA_ARN" ]]; then
  echo "Error: --state-machine-arn and --lambda-arn are required" >&2
  exit 1
fi

if [[ ! "$STRATEGY" =~ ^(cost|speed|balanced)$ ]]; then
  echo "Error: --strategy must be cost, speed, or balanced" >&2
  exit 1
fi

if [[ ! "$NUM_INVOCATIONS" =~ ^[0-9]+$ ]] || [[ "$NUM_INVOCATIONS" -lt 5 ]]; then
  echo "Error: --num must be an integer of at least 5" >&2
  exit 1
fi

if ! jq -en --arg weight "$BALANCED_WEIGHT" '$weight | tonumber | . >= 0 and . <= 1' >/dev/null 2>&1; then
  echo "Error: --balanced-weight must be a number from 0 to 1" >&2
  exit 1
fi

wait_for_target() {
  local elapsed=0 active_execution_arns active_execution_arn active_input active_lambda_arn

  while [[ $elapsed -lt $MAX_WAIT ]]; do
    active_execution_arns=$(aws stepfunctions list-executions \
      --state-machine-arn "$STATE_MACHINE_ARN" \
      --status-filter RUNNING \
      --query 'executions[].executionArn' --output text)

    if [[ -z "$active_execution_arns" || "$active_execution_arns" == "None" ]]; then
      return 0
    fi

    while IFS= read -r active_execution_arn; do
      [[ -z "$active_execution_arn" || "$active_execution_arn" == "None" ]] && continue
      active_input=$(aws stepfunctions describe-execution \
        --execution-arn "$active_execution_arn" \
        --query 'input' --output text)
      active_lambda_arn=$(jq -r '.lambdaARN // empty' <<<"$active_input")

      if [[ "$active_lambda_arn" == "$LAMBDA_ARN" ]]; then
        echo "Waiting for active power tuning execution on $LAMBDA_ARN"
        sleep "$POLL_INTERVAL"
        elapsed=$((elapsed + POLL_INTERVAL))
        continue 2
      fi
    done < <(tr '\t' '\n' <<<"$active_execution_arns")

    return 0
  done

  echo "Timed out waiting for existing power tuning execution on $LAMBDA_ARN" >&2
  return 1
}

POWER_JSON=$(echo "$POWER_VALUES" | tr ',' '\n' | jq -s '.')

INPUT=$(jq -n \
  --arg arn "$LAMBDA_ARN" \
  --argjson power "$POWER_JSON" \
  --argjson num "$NUM_INVOCATIONS" \
  --argjson payload "$PAYLOAD" \
  --arg strategy "$STRATEGY" \
  --argjson balancedWeight "$BALANCED_WEIGHT" \
  '{
    lambdaARN: $arn,
    powerValues: $power,
    num: $num,
    payload: $payload,
    strategy: $strategy,
    balancedWeight: $balancedWeight,
    disablePayloadLogs: true,
    includeOutputResults: true
  }')

echo "Starting power tuning execution..."
echo "Lambda: $LAMBDA_ARN"
echo "Power values: $POWER_VALUES"
echo "Invocations per config: $NUM_INVOCATIONS"

wait_for_target

EXECUTION_ARN=$(aws stepfunctions start-execution \
  --state-machine-arn "$STATE_MACHINE_ARN" \
  --input "$INPUT" \
  --query 'executionArn' --output text)

echo "Execution ARN: $EXECUTION_ARN"

elapsed=0
while [[ $elapsed -lt $MAX_WAIT ]]; do
  STATUS=$(aws stepfunctions describe-execution \
    --execution-arn "$EXECUTION_ARN" \
    --query 'status' --output text)

  case "$STATUS" in
    SUCCEEDED)
      echo "Execution completed successfully"
      OUTPUT=$(aws stepfunctions describe-execution \
        --execution-arn "$EXECUTION_ARN" \
        --query 'output' --output text)

      RESULT=$(jq -ce '
        (.results // .) |
        select(.power != null and (.cost | type == "number") and (.duration | type == "number"))
      ' <<<"$OUTPUT") || {
        echo "Power tuning returned an unexpected result" >&2
        echo "$OUTPUT" >&2
        exit 1
      }
      jq '.' <<<"$RESULT" > "$RESULT_FILE"

      OPTIMAL_POWER=$(jq -r '.power' <<<"$RESULT")
      OPTIMAL_COST=$(jq -r '.cost' <<<"$RESULT")
      OPTIMAL_DURATION=$(jq -r '.duration' <<<"$RESULT")
      VIZ_URL=$(jq -r '.stateMachine.visualization // empty' <<<"$RESULT")

      echo ""
      echo "=== Results ==="
      echo "Optimal memory: ${OPTIMAL_POWER} MB"
      echo "Avg cost:       \$${OPTIMAL_COST}"
      echo "Avg duration:   ${OPTIMAL_DURATION} ms"
      if [[ -n "$VIZ_URL" ]]; then
        echo "Visualization:  $VIZ_URL"
      fi
      echo "Full results:   $RESULT_FILE"
      exit 0
      ;;
    FAILED|TIMED_OUT|ABORTED)
      echo "Execution failed with status: $STATUS" >&2
      aws stepfunctions describe-execution \
        --execution-arn "$EXECUTION_ARN" \
        --query '{status: status, error: error, cause: cause}' >&2
      exit 1
      ;;
    *)
      echo "Status: $STATUS (${elapsed}s elapsed)"
      sleep "$POLL_INTERVAL"
      elapsed=$((elapsed + POLL_INTERVAL))
      ;;
  esac
done

echo "Timed out after ${MAX_WAIT}s" >&2
exit 1
