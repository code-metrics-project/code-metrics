# AWS Lambda

## Deploy

```bash
sam deploy --guided
```

## Build only

```bash
npm run lambda
```

## Testing

```bash
npm run build
```

Copy config to `dist/config` directory.

## Run locally

Start function locally:

```bash
sam local start-lambda
```

Invoke function locally:

```bash
aws lambda invoke --endpoint http://localhost:3001 --function-name CodeMetricsFunction --payload file://events/event.json --cli-binary-format raw-in-base64-out -
```

Alternatively, you can use `curl`:

```bash
curl -XPOST "http://127.0.0.1:3001/2015-03-31/functions/CodeMetricsFunction/invocations" -d @events/event.json
```

## One shot invocation

Invoke Lambda function locally:

```bash
sam local invoke CodeMetricsFunction --event events/event.json --env-vars env.json
```
