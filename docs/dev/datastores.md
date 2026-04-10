# Datastores for Development

This guide covers datastore setup that is useful when developing or testing CodeMetrics locally. It is intended for contributors working on the backend, integration tests, and MiniStack-backed local AWS workflows rather than operators configuring a production deployment.

For end-user datastore configuration, supported implementations, and production-facing settings, see [Datastores Configuration](../datastores.md).

## DynamoDB with MiniStack

Use the MiniStack-backed local AWS stack to emulate DynamoDB locally when you need to develop datastore-backed features or run integration tests without using an AWS account.

### Prerequisites

- Docker and Docker Compose installed
- Local AWS emulator available locally

### Quick Start

```bash
# Start the MiniStack-backed local AWS stack with DynamoDB support
docker compose -f compose/docker-compose.yaml \
               -f compose/docker-compose-aws-local.yaml up -d aws-local

# Confirm DynamoDB is available
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

### Backend Configuration

Configure the backend to use the local AWS DynamoDB endpoint:

```bash
DATASTORE_IMPL=dynamodb
DATABASE_NAME=CodeMetrics
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566
```

When the backend runs inside Docker Compose, use the service hostname instead of `localhost`:

```bash
AWS_ENDPOINT_URL=http://aws-local:4566
```

### Pre-created Tables

The local AWS bootstrap scripts create the DynamoDB tables commonly used by CodeMetrics local workflows:

| Table Name                   | Purpose                       |
| ---------------------------- | ----------------------------- |
| `CodeMetrics_github-issues`  | GitHub issue cache            |
| `CodeMetrics_vcs-cache`      | VCS repository cache          |
| `CodeMetrics_queries`        | Saved queries                 |
| `CodeMetrics_pipeline-cache` | Pipeline build cache          |
| `CodeMetrics_views`          | Dashboard view configurations |
| `CodeMetrics_remote-config`  | Remote configuration cache    |

Depending on the tests you run, additional tables may also be created automatically when `DATASTORE_AUTO_CREATE=true`.

### Manual Table Inspection

Use these commands when debugging local AWS-backed tests or datastore behavior:

```bash
# List all tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Describe a specific table
aws --endpoint-url=http://localhost:4566 dynamodb describe-table --table-name CodeMetrics_github-issues

# Scan table contents
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name CodeMetrics_github-issues
```

### When to Use the local AWS stack

| Aspect           | MiniStack-backed local AWS | AWS DynamoDB         |
| ---------------- | ------------------- | -------------------- |
| Cost             | Free                | Pay per usage        |
| Setup            | Docker only         | AWS account required |
| Speed            | Instant             | Network latency      |
| Data Persistence | Container lifetime  | Permanent            |
| Use Case         | Development/Testing | Production           |

Use the local AWS stack when you need repeatable local feedback for datastore behavior, Lambda-adjacent integration tests, or CI-style AWS emulation. Use a real AWS environment when validating permissions, managed-service behavior, or production-like operational characteristics.

## Related Guides

- [Testing Guide](./testing.md) for running local AWS-backed tests
- [Datastores Configuration](../datastores.md) for datastore options and production configuration
- [Secret Management](../secret_management.md) for Secrets Manager setup against the local AWS stack
- [Local AWS bootstrap](../../compose/aws-local-init/README.md) for bootstrap scripts and seeded resources