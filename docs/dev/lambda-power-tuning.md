# Lambda Power Tuning

> **Note**: This documentation was generated with AI assistance.

This guide covers running [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) against CodeMetrics API, query-processing, and mocks Lambdas to compare memory configurations.

The workflow only accepts non-production environment slugs. Deploy a dedicated environment before tuning so repeated queries cannot affect production data or downstream systems.

## Prerequisites

- A deployed CodeMetrics environment such as `dev`, with environment-scoped stacks:
  - `CodeMetrics-<environment>-Backend`, including `BackendLambdaName` and `QueryProcessingLambdaName`
  - `CodeMetrics-<environment>-Frontend`, including `apiBaseUrl`
  - `CodeMetricsMock-<environment>`, including `MockLambdaName`, when tuning mocks
- GitHub Actions secret `AWS_DEPLOY_ROLE_ARN` with permission to:
  - Read the target CloudFormation stacks and Lambda functions
  - Invoke the target Lambda functions
  - Use Serverless Application Repository (to deploy the power tuning SAR app)
  - Use Step Functions (to run the power tuning state machine)
- GitHub Actions secret `POWER_TUNING_ACCESS_TOKEN`, containing a dedicated access token for the target CodeMetrics environment
- Variable `AWS_REGION` (default: `eu-west-2`)

The API workload includes the access token in the Step Functions execution input. Payload logging is disabled, but operators with permission to inspect Step Functions executions may still see the input. Use a dedicated token and rotate it after tuning.

## GitHub Actions workflow

### `lambda-power-tuning.yaml`

Runs AWS Lambda Power Tuning against the backend and/or mocks Lambdas. Manual dispatch only.

Inputs:

| Input                  | Description                                               | Default                      |
| ---------------------- | --------------------------------------------------------- | ---------------------------- |
| `target`               | `backend`, `mocks`, or `both`                             | Required                     |
| `environment`          | Non-production environment slug                           | `dev`                        |
| `power_values`         | Comma-separated memory sizes in MB                        | `256,512,1024,2048,3008`     |
| `num_invocations`      | Invocations per memory configuration, minimum 5           | `10`                         |
| `strategy`             | `balanced`, `cost`, or `speed`                            | `balanced`                   |
| `balanced_weight`      | Cost weighting for `balanced`, from `0` (speed) to `1`    | `0.5`                        |
| `load_test_iterations` | End-to-end async query runs for each representative query | `3`                          |

Runs for one environment are serialised. Matrix targets do not cancel each other when one fails, and each target waits for an existing Power Tuning execution on the same Lambda before starting. This prevents an execution left running after job cancellation from deleting another execution's temporary `RAM<value>` aliases. The workflow rejects `prod` and fails when a stack, output, or Lambda cannot be resolved; it does not silently skip missing targets.

Selecting `backend` runs three measurements:

1. AWS Lambda Power Tuning invokes `BackendLambdaName` with authenticated HTTP API events for synchronous `POST /api/query` processing.
2. AWS Lambda Power Tuning invokes `QueryProcessingLambdaName` directly with SQS-shaped events. This measures query execution and result-cache writes, but excludes SQS waiting time.
3. After tuning restores the deployed configuration, the workflow submits the same queries to `POST /api/query/async` and polls their results. This reports end-to-end queue latency separately.

Selecting `mocks` tunes `MockLambdaName` with the Sonar `search_history` event. Selecting `both` runs all backend and mocks measurements.

## Representative query workloads

The backend measurements use an equal-weight mix of:

| Profile | Query          | Workload | Date window | Observed Playwright duration |
| ------- | -------------- | -------- | ----------- | ---------------------------- |
| Light   | `pr-size`      | `gaia`   | 7 days      | 5.466 seconds median         |
| Heavy   | `pr-open-time` | `athena` | 7 days      | 21.376 seconds median        |

These profiles come from the completed, successful main-branch CI runs `34460058957`, `34461491391`, and `34461631866` on 10 September 2026. The timings include browser setup and mock latency, so they are not Lambda execution timings. They provide a consistent relative signal: `pr-open-time` took about three to four times as long as the light query, and the query suite's shard took 355 to 422 seconds while other shards took 124 to 187 seconds.

The default memory set starts at 256 MB. In the first live `dev` runs, the representative workload reached the backend's 180-second timeout at 128 MB in both API and query-consumer modes, while every setting from 256 MB upward completed. You can still include 128 MB explicitly for a different target or workload.

`build-power-tuning-payload.sh` calculates the seven-day window when the workflow runs. It emits weighted HTTP API events for the API Lambda, SQS events for the query-processing Lambda, or raw queries for the end-to-end async test.

## Isolation and side effects

The workflow does not create a separate CodeMetrics deployment. It targets the existing environment selected by `environment`.

AWS Lambda Power Tuning changes the target function's `$LATEST` memory, publishes temporary versions and `RAM<value>` aliases, invokes those versions, restores the original `$LATEST` configuration, and removes the temporary resources. The workflow does not enable `autoOptimize`, so it reports a recommendation without applying it permanently.

Temporary Lambda versions isolate the tested memory settings. They do not isolate DynamoDB tables, SQS queues, mock services, configuration, or external systems. Every invocation performs real application work in the selected environment. The SAR power-tuning stack is shared in the AWS account and region and remains deployed for later runs.

Interpret the outputs separately:

- API Lambda results cover authenticated request parsing and synchronous query processing.
- Query-processing Lambda results cover direct execution of SQS-shaped jobs and result-cache writes.
- Async latency results cover submission, real queue waiting, consumer execution, cache storage, and polling with exponential backoff at the environment's restored memory configuration.
- Mocks results cover only the configured Sonar mock request.

The workflow posts Lambda cost and duration summaries for each target, plus a separate async latency table containing sample count, average, and maximum duration for each representative query.

## Manual run

```bash
cd deployment/scripts

PAYLOAD="$(./build-power-tuning-payload.sh \
  --mode query-consumer \
  --start-date 2026-09-03 \
  --end-date 2026-09-10)"

./run-power-tuning.sh \
  --state-machine-arn "arn:aws:states:REGION:ACCOUNT:stateMachine:powerTuningStateMachine-..." \
  --lambda-arn "arn:aws:lambda:REGION:ACCOUNT:function:FUNCTION_NAME" \
  --power-values "128,256,512,1024,2048,3008" \
  --num 10 \
  --strategy balanced \
  --balanced-weight 0.5 \
  --payload "$PAYLOAD"
```

For API mode, export `POWER_TUNING_ACCESS_TOKEN` before running `build-power-tuning-payload.sh --mode api`. To measure the deployed async flow manually:

```bash
export POWER_TUNING_ACCESS_TOKEN="..."

./run-async-query-load-test.sh \
  --base-url "https://example.execute-api.eu-west-2.amazonaws.com" \
  --iterations 3
```

Supporting files in `deployment/scripts/`:

- `resolve-power-tuning-target.sh` resolves environment-scoped stack outputs and rejects production.
- `build-power-tuning-payload.sh` builds the measured light and heavy query events.
- `run-power-tuning.sh` starts and monitors AWS Lambda Power Tuning.
- `run-async-query-load-test.sh` submits and polls real async queries.
- `power-tuning-payload-mocks.json` contains the API Gateway v2 Sonar `search_history` event.
