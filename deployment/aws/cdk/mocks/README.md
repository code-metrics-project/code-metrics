# AWS CDK CodeMetrics Mock Deployment

## Design

- Use `config.yaml` to customise the deployment (`cdk.json` is CDK feature flags only).
- `global.environment` (required) scopes the CloudFormation stack id, e.g. `CodeMetricsMock-dev`. The `CODEMETRICS_ENV` environment variable overrides it when set.
- Optional `aws.account` / `aws.region` select the deploy target; otherwise ambient credentials are used.

### Default Components

- Imposter Go Lambda (`provided.al2023`)
- API Gateway HTTP API or Lambda Function URL to expose the mock endpoints

## Demo Target

This package is intended to provide a push-button deployment path for the CodeMetrics mock services into AWS. It assumes:

- the Imposter Go Lambda artifact has already been staged into `deployment/dist/imposter-go-lambda` (run `make build-imposter-go-lambda` from `deployment/`, which downloads the pinned release binary and plugin — no Go toolchain needed)
- the artifact keeps the expected layout: a `bootstrap` binary alongside `plugins/` and `config/` directories
- mock configuration is packaged inside that Lambda asset (from the repository `mocks/` directory)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npm run deploy` deploy the mock stack
- `npm run diff` compare deployed stack with current state
- `npm run synth` emit the synthesized CloudFormation template

## Notes

- `lambdaAssetPath` must point at a real packaged Imposter Go Lambda artifact before `synth` or `deploy` will succeed
- The stack id changes per environment (`CodeMetricsMock-<env>`); CI and Makefile output lookups scan all stacks for the `MockBaseUrl` output, so they stay name-agnostic
