# Async Query API

The async query API provides a request/response pattern for long-running queries, preventing connection drops and timeouts.

## API Endpoints

### Submit Async Query

```
POST /api/query/async
```

Request body is the same as the synchronous `/api/query` endpoint:

```json
{
  "queryName": "deployment-frequency",
  "args": {
    "workloads": ["workload-1"],
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

Response (202 Accepted):

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "pollUrl": "/api/query/async/550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Async Query Result

```
GET /api/query/async/{jobId}
```

Responses:

| Status | Meaning                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------- |
| 200    | Query complete - body contains metrics result                                                  |
| 202    | Query queued or still processing - body: `{"status": "pending"}` or `{"status": "processing"}` |
| 204    | Job not found or expired                                                                       |
| 500    | Query failed - body: `{"error": "error message"}`                                              |

Jobs are recorded as `pending` when submitted, so polling begins returning `202` even
while the query waits in the queue behind other jobs.

Results are automatically deleted after retrieval (200 or 500) to prevent unbounded growth.

## Polling Strategy

Recommended polling approach:

1. Start with 1-second intervals
2. Apply exponential backoff (1.5x multiplier)
3. Cap maximum interval at 5 seconds
4. Set a reasonable timeout (60 seconds default)

Example:

```typescript
const { jobId } = await submitAsyncQuery(query);
const result = await pollForResult(jobId, 60000, 1000);
```

## Configuration

| Environment Variable             | Description                          | Default |
| -------------------------------- | ------------------------------------ | ------- |
| `FEATURE_ASYNC_QUERY`            | Enable async query processing        | `false` |
| `ASYNC_QUERY_QUEUE_URL`          | SQS queue URL (serverless only)      | -       |
| `ASYNC_QUERY_RESULT_TTL`         | Result cache TTL in seconds          | `3600`  |
| `ASYNC_QUERY_WORKER_CONCURRENCY` | Max concurrent queries (server mode) | `1`     |

## Serverless Deployment

In serverless mode (AWS Lambda), the architecture uses:

- **AWS SQS** as the message queue between the API Lambda and executor Lambda
- **DynamoDB** as the result cache with TTL-based expiry
- **Separate Lambda function** (`QueryExecutorFunction`) triggered by SQS

The SAM template (`deployment/lambda/infra/template.yaml`) defines:

1. `AsyncQueryQueue` - SQS queue for job messages
2. `QueryExecutorFunction` - Lambda triggered by SQS with `INVOCATION_MODE=execute-query`
3. IAM permissions for SQS access and DynamoDB read/write

## Migration from Sync to Async

The synchronous `/api/query` endpoint remains available for backward compatibility. To migrate:

1. Enable with `FEATURE_ASYNC_QUERY=true`
2. Use `useAsyncCMQuery` hook instead of `useCMQuery` in React components
3. The async hook handles polling internally

## Architecture

```
Client -> POST /api/query/async -> Queue -> Executor -> Result Cache
Client -> GET  /api/query/async/{id} -> Result Cache -> Response
```

In server mode, the queue and executor run in-process. In serverless mode, SQS and a separate Lambda handle execution.
