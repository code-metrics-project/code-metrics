# Local AWS Testing

This directory contains bootstrap scripts for testing AWS services locally. The default compose stack uses MiniStack for Secrets Manager, DynamoDB, and deployed Node.js Lambda workflows.

- **Secrets Manager** - Store and retrieve secrets
- **DynamoDB** - NoSQL datastore for caching
- **Lambda** - Serverless function execution
- **API Gateway** - HTTP API endpoints

## Quick Start

### Option 1: Node.js Backend with MiniStack-backed services

Use the default local AWS stack for Secrets Manager and DynamoDB while running the Node.js backend locally:

```bash
docker-compose -f compose/docker-compose.yaml -f compose/docker-compose-aws-local.yaml --project-directory . up --build
```

### Option 2: Full Lambda Deployment (Production-like)

Run CodeMetrics as a Lambda function in MiniStack for production-like testing:

```bash
# First, build the Lambda package
cd backend && npm run build:lambda && cd ..

# Then start MiniStack with Lambda deployment
docker-compose -f compose/docker-compose-aws-local.yaml -f compose/docker-compose-aws-local-lambda.yaml --project-directory . up --build
```

### Option 3: Standalone local AWS emulator

Run the local AWS emulator independently for backend development:

```bash
docker-compose -f compose/docker-compose-aws-local.yaml up -d
```

Then configure your backend `.env`:

```bash
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
SECRET_RESOLVER_IMPL=secretsmanager
DATASTORE_IMPL=dynamodb
```

## What Gets Created

The local AWS stack will automatically:

- Start on port 4566
- Create test secrets from `01-create-secrets.sh`
- Create DynamoDB tables from `02-create-dynamodb-tables.sh`
- (If using Lambda mode) Deploy the CodeMetrics Lambda function

## Configuration

The API service is automatically configured to use the local AWS stack via these environment variables:

```yaml
AWS_REGION: us-east-1
AWS_ENDPOINT_URL: http://aws-local:4566
SECRET_RESOLVER_IMPL: secretsmanager
DATASTORE_IMPL: dynamodb
```

---

## Secrets Manager

### Adding Test Secrets

Edit `aws-local-init/01-create-secrets.sh` to add your test secrets:

```bash
aws --endpoint-url "$AWS_ENDPOINT_URL" secretsmanager create-secret \
  --name MY_SECRET_NAME \
  --secret-string "my-secret-value" \
  --description "Description"
```

**Note:** The `01-create-secrets.sh` script contains example placeholder values. Replace these with your actual credentials for local testing. These example values are safe to commit to source control.

Then restart the stack to apply changes.

## Using Secrets in Config Files

Reference secrets in your configuration files using the same syntax as production:

```yaml
githubApp:
  appId: "${secret.GITHUB_APP_ID}"
  privateKey: "${secret.GITHUB_APP_PRIVATE_KEY}"
  installationId: "${secret.GITHUB_APP_INSTALLATION_ID}"
```

## Managing Secrets Manually

Use the AWS CLI against the local endpoint to manage secrets:

```bash
# List all secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets

# Get a specific secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id GITHUB_APP_ID

# Create a new secret
aws --endpoint-url=http://localhost:4566 secretsmanager create-secret \
    --name TEST_SECRET \
    --secret-string "test-value"

# Update a secret
aws --endpoint-url=http://localhost:4566 secretsmanager update-secret \
    --secret-id TEST_SECRET \
    --secret-string "new-value"

# Delete a secret
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 secretsmanager delete-secret --secret-id TEST_SECRET
```

---

## DynamoDB

### Pre-created Tables

The `02-create-dynamodb-tables.sh` script creates all required DynamoDB tables:

- `CodeMetrics_github-issues`
- `CodeMetrics_github-workflow-runs`
- `CodeMetrics_vcs-cache`
- `CodeMetrics_repo-commits`
- `CodeMetrics_commit-prs`
- `CodeMetrics_pipeline-executions`
- `CodeMetrics_vulns`
- `CodeMetrics_alerts`
- `CodeMetrics_queries`
- And more...

### Managing DynamoDB Tables

```bash
# List all tables
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Describe a table
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 dynamodb describe-table --table-name CodeMetrics_github-issues

# Scan table contents
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name CodeMetrics_github-issues

# Delete all items from a table (clear cache)
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name CodeMetrics_github-issues \
  --query 'Items[*].[pk.S, sk.S]' --output text | \
  while read pk sk; do
    aws --endpoint-url=http://localhost:4566 dynamodb delete-item --table-name CodeMetrics_github-issues \
      --key "{\"pk\": {\"S\": \"$pk\"}, \"sk\": {\"S\": \"$sk\"}}"
  done
```

---

## Lambda (Optional)

### Lambda Deployment

When using the Lambda compose overlay, CodeMetrics is deployed as an AWS Lambda function on MiniStack:

```bash
docker-compose -f compose/docker-compose-aws-local.yaml -f compose/docker-compose-aws-local-lambda.yaml --project-directory . up --build
```

### Invoking the Lambda Function

```bash
# Direct invocation
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 lambda invoke \
  --function-name codemetrics-api \
  --payload '{"httpMethod": "GET", "path": "/api/health"}' \
  /tmp/response.json && cat /tmp/response.json

# Via API Gateway (if configured)
curl http://localhost:4566/restapis/<api-id>/local/_user_request_/api/health
```

### Updating the Lambda Function

After making code changes:

```bash
# Rebuild the Lambda package
cd backend && npm run build:lambda && cd ..

# Update the function
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 lambda update-function-code \
  --function-name codemetrics-api \
  --zip-file fileb:///lambda-code/lambda.zip
```

---

## Testing Without a Local AWS Emulator

For simple file-based testing (default behavior):

```yaml
# Use file-based secret resolver (default)
SECRET_RESOLVER_IMPL: file
# Secrets are loaded from config/secrets.yaml
```

## Persistence

MiniStack state is in-memory by default. Delete any mounted state directory you add locally if you enable persistence.

## Differences from AWS

MiniStack emulates AWS services locally but still has some limitations:

- No IAM authentication (all operations succeed)
- No encryption key management
- Some advanced features may not be fully implemented

For production-like testing, use an actual AWS account with a dedicated testing environment.

## Troubleshooting

**Secrets not found:**

- Check initialization script ran: `docker-compose logs aws-local | grep "Test secrets created"`
- Verify secrets exist: `docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets`

**Connection errors:**

- Ensure `AWS_ENDPOINT_URL=http://aws-local:4566` is set when running inside Docker Compose
- Check MiniStack is running: `docker-compose ps aws-local`

**SSL errors:**

- Local AWS emulation may use self-signed certificates in some setups
- Set `NODE_TLS_REJECT_UNAUTHORIZED=0` for development (already configured)
