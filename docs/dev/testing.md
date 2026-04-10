# Testing Guide

This guide covers running tests for CodeMetrics, including unit tests, integration tests, and local AWS service testing.

## Test Types

| Test Type   | Command                      | Description                                          |
| ----------- | ---------------------------- | ---------------------------------------------------- |
| Unit        | `npm test`                   | Fast tests with mocked dependencies                  |
| Integration | `npm run test:integration`   | Tests with real service connections (Imposter mocks) |
| Slow        | `npm run test:slow`          | Long-running tests (ML predictions, etc.)            |
| Full        | `npm run test:full-coverage` | All tests with combined coverage                     |

## Running Unit Tests

Unit tests run quickly with all dependencies mocked:

```bash
cd backend
npm test
```

## Running Integration Tests

Integration tests require the Imposter mock server for VCS/pipeline service simulation:

```bash
cd backend

# Install Imposter CLI (one-time)
brew install imposter-project/imposter/imposter

# Run integration tests (Imposter starts automatically via jest)
npm run test:integration
```

---

## Local AWS Integration Tests

The default local AWS stack uses MiniStack for DynamoDB, Secrets Manager, and deployed Node.js Lambda validation without requiring AWS credentials.

### Prerequisites

- Docker and Docker Compose installed
- Local AWS container running

### Quick Start

**1. Start the local AWS stack:**

```bash
# From project root
docker compose -f compose/docker-compose-aws-local.yaml up -d

# Verify the emulator is healthy
./scripts/wait-for-local-aws.sh http://localhost:4566 60
```

**2. Run tests with the local AWS stack:**

```bash
cd backend

# Set environment variables and run tests
AWS_REGION=us-east-1 \
AWS_ENDPOINT_URL=http://localhost:4566 \
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
npm run test:integration
```

### Using .env File

Instead of setting environment variables each time, you can create a `.env.aws-local` file:

```bash
# backend/.env.aws-local
AWS_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
DATASTORE_IMPL=dynamodb
DATABASE_NAME=CodeMetrics
LOOKUP_CACHE_ENABLED=true
```

Then run tests with:

```bash
cd backend
node --env-file=.env.aws-local node_modules/.bin/jest --group=integration
```

### Local AWS Test Files

The following test files specifically test AWS service integrations against the local AWS stack:

| File                                                  | Tests                                                    |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `src/config/__tests__/secretsManagerAwsLocal.spec.ts` | Secrets Manager secret resolution                        |
| `src/db/dynamodb/__tests__/dynamodb.awsLocal.spec.ts` | DynamoDB CRUD operations                                 |
| `src/__tests__/lambda-handler.spec.ts`                | Lambda handler with serverless-express                   |
| `src/__tests__/lambda-events.spec.ts`                 | Real CodeMetrics app via serverless-express (in-process) |
| `src/__tests__/lambda-dynamodb-e2e.spec.ts`           | Lambda + DynamoDB end-to-end                             |
| `src/__tests__/lambda-deployed.spec.ts`               | True Lambda deployment tests via AWS SDK                 |

### How Tests Auto-Skip

Local AWS tests automatically skip when the local endpoint is not configured:

```typescript
const isLocalAwsAvailable = () => !!process.env.AWS_ENDPOINT_URL;
const describeIfLocalAws = isLocalAwsAvailable() ? describe : describe.skip;

describeIfLocalAws("DynamoDB with local AWS", () => {
  // Tests only run when AWS_ENDPOINT_URL is set
});
```

This means:

- **Without the local endpoint**: Tests are skipped silently
- **With the local endpoint**: Tests run against the local AWS services

---

## Testing DynamoDB Datastore

### Start the local AWS stack with DynamoDB

```bash
docker compose -f compose/docker-compose-aws-local.yaml up -d
```

Tables are automatically created by the bootstrap service.

### Verify Tables Exist

```bash
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

### Run DynamoDB-Specific Tests

```bash
cd backend
AWS_REGION=us-east-1 \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run test:integration -- --testPathPattern="dynamodb"
```

---

## Testing Lambda Handler

The Lambda handler tests verify that the serverless-express wrapper correctly processes API Gateway events.

### Run Lambda Handler Tests

These tests don't require the local AWS emulator (they test the handler in isolation):

```bash
cd backend
npm run test:integration -- --testPathPattern="lambda-handler"
```

### Run Full Lambda + DynamoDB E2E Tests

These require the local AWS stack:

```bash
cd backend
AWS_REGION=us-east-1 \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run test:integration -- --testPathPattern="lambda-dynamodb"
```

---

## Testing Deployed Lambda Functions

For true end-to-end deployed-Lambda testing, use MiniStack and invoke the Lambda via the AWS SDK.

### Deploy Lambda to MiniStack

Use the provided deployment script (self-contained, no prior setup needed):

```bash
# From project root
./scripts/deploy-lambda-aws-local.sh
```

The script will:

- Start the local AWS emulator if not running
- Rebuild the backend release artifact before packaging the Lambda
- Create IAM role and DynamoDB tables
- Package and deploy the Lambda function
- Create a function URL
- Test the deployment

### Run Deployed Lambda Tests

```bash
# Deploy and run tests in one command
./scripts/deploy-lambda-aws-local.sh --run-tests

# Or run tests separately after deployment
cd backend
LAMBDA_DEPLOYED=true \
AWS_REGION=us-east-1 \
AWS_ENDPOINT_URL=http://localhost:4566 \
npm run test:e2e:aws-local-deploy
```

### Script Options

| Option            | Description                                |
| ----------------- | ------------------------------------------ |
| `-t, --run-tests` | Run lambda-deployed tests after deployment |
| `-h, --help`      | Show help message                          |

---

## CI/CD Pipeline Testing

The GitHub Actions workflow runs MiniStack-backed integration tests automatically, including the deployed-Lambda validation path:

```yaml
# .github/workflows/backend.yaml
test-backend-aws-local-deploy:
  services:
    aws-local:
      image: nahuelnucera/ministack:latest
      ports:
        - 4566:4566
      env:
        LAMBDA_EXECUTOR: local
  steps:
    - name: Deploy Lambda to MiniStack
      env:
        AWS_REGION: us-east-1
        AWS_ENDPOINT_URL: http://localhost:4566
        AWS_ACCESS_KEY_ID: test
        AWS_SECRET_ACCESS_KEY: test
      run: ./scripts/deploy-lambda-aws-local.sh
```

---

## Troubleshooting

### MiniStack Not Responding

```bash
# Check if MiniStack container is running
docker compose -f compose/docker-compose-aws-local.yaml ps

# Check MiniStack logs
docker compose -f compose/docker-compose-aws-local.yaml logs aws-local

# Restart MiniStack
docker compose -f compose/docker-compose-aws-local.yaml restart aws-local
```

### Tests Still Skipping with MiniStack Running

Ensure environment variables are set correctly:

```bash
# Verify AWS_ENDPOINT_URL is set
echo $AWS_ENDPOINT_URL
# Should output: http://localhost:4566

# Test connectivity
curl http://localhost:4566/_ministack/health
```

### DynamoDB Tables Not Found

Tables are created automatically on first access. If issues persist:

```bash
# Manually create tables
docker compose -f compose/docker-compose-aws-local.yaml exec aws-local \
  aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name CodeMetrics_test \
    --attribute-definitions AttributeName=CacheKey,AttributeType=S \
    --key-schema AttributeName=CacheKey,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

### Clean Up Local AWS Data

```bash
# Stop and remove volumes
docker compose -f compose/docker-compose-aws-local.yaml down -v

# Restart fresh
docker compose -f compose/docker-compose-aws-local.yaml up -d
```

---

## See Also

- [Datastores Configuration](../datastores.md) - DynamoDB and other datastore setup
- [Datastores for Development](./datastores.md) - MiniStack datastore setup and DynamoDB debugging workflows for contributors
- [Lambda for Development](./lambda.md) - MiniStack-based Lambda deployment and invocation workflows for contributors
- [Secrets for Development](./secrets.md) - MiniStack-based Secrets Manager setup and test secret workflows for contributors
- [Secret Management](../secret_management.md) - Secrets Manager configuration
- [Lambda Deployment](../deployment_lambda.md) - Lambda deployment guide
- [Local AWS README](../../compose/aws-local-init/README.md) - Local AWS initialization details
