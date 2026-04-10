# Lambda for Development

This guide covers Lambda-specific workflows that are useful for contributors developing and testing CodeMetrics locally. The local AWS stack now uses MiniStack for both the standard datastore/secrets workflow and the deployed Node.js Lambda validation path.

For end-user and production deployment guidance, see [Deployment on AWS Lambda](../deployment_lambda.md).

## Local Lambda Testing with MiniStack

Before deploying to AWS, you can test the Lambda packaging and deployment flow locally with [MiniStack](https://github.com/Nahuel990/ministack). Use this path when you specifically need the deployed Node.js Lambda execution workflow; for non-deployed local AWS integration work, use the same base compose file backed by MiniStack.

### Prerequisites

- Docker and Docker Compose

### Quick Start

```bash
# Deploy the packaged Lambda into MiniStack
./scripts/deploy-lambda-aws-local.sh

# Or deploy and run the deployed-Lambda test suite
./scripts/deploy-lambda-aws-local.sh --run-tests
```

### What Gets Deployed

The MiniStack-based Lambda setup creates development resources that mirror the main Lambda flow:

- A Lambda function named `codemetrics-api` using the Node.js 20.x runtime
- DynamoDB tables required by the datastore
- Secrets Manager entries containing test secrets
- Supporting HTTP entrypoints used by the local test flow

### Testing the Lambda Function

Use the AWS CLI inside the emulator container to inspect or invoke the function directly:

```bash
# List deployed functions
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 lambda list-functions

# Invoke the function directly
docker-compose exec aws-local aws --endpoint-url=http://localhost:4566 lambda invoke \
  --function-name codemetrics-api \
  --payload '{"httpMethod": "GET", "path": "/api/health"}' \
  /tmp/response.json && cat /tmp/response.json
```

### Updating Code During Development

After changing backend code, rerun the deployment script. It rebuilds the backend release artifact before packaging and updates the deployed function in MiniStack:

```bash
./scripts/deploy-lambda-aws-local.sh
```

### MiniStack vs AWS Lambda

| Feature            | MiniStack | AWS Production   |
| ------------------ | ---------- | ---------------- |
| IAM Authentication | Disabled   | Enabled          |
| Cold starts        | Minimal    | 2-5 seconds      |
| Secrets encryption | Simulated  | KMS-encrypted    |
| API Gateway        | Basic      | Full feature set |
| Cost               | Free       | Pay-per-use      |

Use MiniStack for fast contributor feedback loops and integration tests. Use real AWS deployments when you need to validate permissions, service limits, or production infrastructure behavior.

## Related Guides

- [Testing Guide](./testing.md) for Lambda-related test execution
- [Datastores for Development](./datastores.md) for MiniStack-backed DynamoDB workflows
- [Deployment on AWS Lambda](../deployment_lambda.md) for production deployment guidance
- [Local AWS initialization](../../compose/aws-local-init/README.md) for seeded resources and bootstrap scripts
