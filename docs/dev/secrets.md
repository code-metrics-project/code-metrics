# Secrets for Development

This guide covers contributor-facing workflows for using AWS Secrets Manager through the MiniStack-backed local AWS stack during local development and testing.

For production-facing secret resolver configuration and AWS Secrets Manager usage, see [Managing secrets](../secret_management.md).

## Secrets Manager with MiniStack

Use the local AWS stack when you need to develop or test CodeMetrics against the `secretsmanager` resolver without relying on real AWS credentials.

### Quick Start

Start CodeMetrics with the local AWS compose setup:

```bash
docker-compose -f compose/docker-compose.yaml -f compose/docker-compose-aws-local.yaml --project-directory . up --build
```

This local development stack will:

- Start MiniStack on port `4566`
- Create test secrets from `compose/aws-local-init/01-create-secrets.sh`
- Configure the backend to use the local Secrets Manager endpoint

### Backend Configuration

The backend is typically configured for the local Secrets Manager endpoint with:

```yaml
AWS_REGION: us-east-1
AWS_ENDPOINT_URL: http://aws-local:4566
SECRET_RESOLVER_IMPL: secretsmanager
```

### Adding Test Secrets

To seed additional secrets for local development, update `compose/aws-local-init/01-create-secrets.sh`:

```bash
aws --endpoint-url "$AWS_ENDPOINT_URL" secretsmanager create-secret \
    --name MY_SECRET_NAME \
    --secret-string "my-secret-value" \
    --description "Description"
```

Restart the local AWS stack after changing the seed script so the updated secrets are recreated.

### Managing Secrets Manually

Use these commands when debugging secret resolution locally:

```bash
# List all secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets

# Get a secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value --secret-id MY_SECRET_NAME

# Update a secret
aws --endpoint-url=http://localhost:4566 secretsmanager update-secret \
    --secret-id MY_SECRET_NAME \
    --secret-string "new-value"

# Delete a secret
aws --endpoint-url=http://localhost:4566 secretsmanager delete-secret \
    --secret-id MY_SECRET_NAME \
    --force-delete-without-recovery
```

### Persistence Notes

Secrets in the local AWS stack do not persist across full container recreation unless you add your own persistence strategy. Secrets defined in `01-create-secrets.sh` are recreated automatically on startup, which is usually the right behavior for repeatable test and development environments.

## Related Guides

- [Testing Guide](./testing.md) for local AWS-backed test execution
- [Lambda for Development](./lambda.md) for the MiniStack deployed-Lambda workflow that depends on test secrets
- [Datastores for Development](./datastores.md) for local AWS-backed DynamoDB workflows
- [Local AWS bootstrap](../../compose/aws-local-init/README.md) for bootstrap scripts and seeded resources
