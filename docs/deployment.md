# Deployment overview

You can run CodeMetrics in a number of ways:

- Docker or Docker Compose
- AWS Lambda
- AWS CDK (Lambda + CloudFront + optional Cognito/DynamoDB/mocks)
- Kubernetes
- Using Node.js directly

The easiest way to get started locally is to use Docker Compose.

Once you have chosen an approach, continue to the [configuration guide](./configuration.md).

---

## Docker Compose

See the [Docker deployment instructions](./deployment_docker.md).

## AWS Lambda

CodeMetrics can be deployed to AWS Lambda. See the [AWS Lambda deployment instructions](./deployment_lambda.md).

## AWS CDK

CodeMetrics can be deployed to AWS with CDK stacks for the backend, frontend, optional Cognito/DynamoDB, and an optional mocks stack. See the [AWS CDK deployment instructions](./deployment_cdk.md).

## Kubernetes

The CodeMetrics Docker containers can also be run on Kubernetes. See the [instructions for using Helm](./helm.md).

## Using Node.js directly

See the [Node.js deployment instructions](./run_local_node.md).

---

## Next steps

Learn [how to configure CodeMetrics](./configuration.md) for your team.
