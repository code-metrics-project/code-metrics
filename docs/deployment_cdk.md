# Deployment with AWS CDK

> **Note**: This documentation was generated with AI assistance.

## Introduction

AWS CDK provides an infrastructure-as-code path for deploying CodeMetrics to AWS. The CDK packages under `deployment/aws/cdk/` provision the backend Lambda, frontend (S3 + CloudFront), optional Cognito auth, DynamoDB cache tables, and (for demos) an Imposter Go mocks stack.

This is distinct from the [SAM/Lambda packaging guide](./deployment_lambda.md), which covers publishing a pre-built Lambda zip. Use CDK when you want the surrounding AWS resources (auth, datastore, frontend CDN, mocks) created and wired together from config.

### When to choose CDK

**Best suited for:**

- **Full AWS demo or staging environments** where you want Cognito, DynamoDB, CloudFront, and the API deployed together
- **Infrastructure as code** managed alongside the application in this repository
- **Mock-backed demos** that pair the native app stacks with the Imposter Go mocks stack

**Consider alternatives if:**

- You only need to run the API Lambda against existing infrastructure — see [AWS Lambda deployment](./deployment_lambda.md)
- You prefer containers — see [Docker](./deployment_docker.md) or [Kubernetes/Helm](./helm.md)

## Architecture overview

Two CDK applications live under `deployment/aws/cdk/`:

| Package    | Path                        | What it deploys                                                                                                           |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Native** | `deployment/aws/cdk/native` | Backend Lambda, async query SQS queue + processing Lambda, frontend on S3/CloudFront, optional Cognito, optional DynamoDB |
| **Mocks**  | `deployment/aws/cdk/mocks`  | Imposter Go Lambda behind API Gateway (demo data providers)                                                               |

The native app synthesises several CloudFormation stacks (application registry, datastore, auth, backend, frontend) from a single `config.yaml`.

```
┌──────────────────────┐     ┌─────────────────────────────┐
│ Mocks stack (opt.)   │     │ Native stacks               │
│ Imposter Go Lambda   │◄────│ Backend Lambda              │
│ API Gateway          │     │  └► SQS queue ─► Query Lambda│
└──────────────────────┘     │ Frontend S3 + CloudFront    │
                              │ Cognito + DynamoDB (opt.)   │
                              └─────────────────────────────┘
```

Async query requests are enqueued by the backend Lambda onto the SQS queue and executed by the dedicated query-processing Lambda (same code asset, `INVOCATION_MODE=execute-query`); results are stored in the `asyncQueryResults` DynamoDB table.

For the end-to-end mock-backed demo (CI, GitHub Actions, Imposter Go version pinning), see the [Demo instance deployment](./dev/demo-deployment.md) runbook.

## Prerequisites

- AWS CLI configured for the target account
- Node.js 20+
- AWS CDK CLI (`npm install -g aws-cdk`). The deploy workflow uses each CDK app's own `aws-cdk` devDependency through `npx cdk`. That CLI must support the cloud assembly schema written by the app's `aws-cdk-lib`, so upgrade the two packages together with `make -C deployment update-cdk`. The `cdk-cli-compat` Jest test in each app fails if the CLI is too old.
- Target account/region CDK-bootstrapped:
  ```bash
  npx cdk bootstrap aws://ACCOUNT_ID/REGION
  ```
- Staged application artifacts under `deployment/dist/` (see [deployment/README.md](../deployment/README.md))

## Configuration (`config.yaml`)

CDK **infrastructure** settings live in YAML next to each CDK app — **not** in `cdk.json`.

- Native: `deployment/aws/cdk/native/config.yaml`
- Mocks: `deployment/aws/cdk/mocks/config.yaml`

`cdk.json` is reserved for CDK feature-flag context. `bin/cdk.ts` / `bin/mocks.ts` load `config.yaml` at synth/deploy time.

CodeMetrics **application** config (`remote-config.yaml`, workloads, license, RBAC, etc.) is **not** stored inside the CDK package. Stage it into `deployment/dist/codemetrics-api/config` before deploy (see [deployment/README.md](../deployment/README.md)). The backend Lambda asset path points at that staged directory.

### Native `config.yaml` highlights

```yaml
aws:
  region: # optional; omit to use ambient AWS credentials/region
  account: # optional

global:
  name: CodeMetrics
  environment: dev # required — scopes stack ids and resource names (see "Environments")

frontend:
  # Optional: frontend.auth.provided.{user,pass} publishes a login hint into config.json
  s3:
    # bucketName: optional override; default is '<resourcePrefix>-frontend'
    # ...

backend:
  features:
    dora: true
    languageSelector: true
    mlForecasts: true
    predictions: true
    temporalCoupling: true
  memorySize: 1024
  timeout: 180
  environment:
    AccessTokenSecret: "" # required — deploy fails if left empty
    CORSAllowedOrigin: "*"
    # ...

datastore:
  dynamodb:
    create: true
    # tableName: optional table-prefix override; default is the resource prefix
    # ...

auth:
  cognito:
    create: true
    # Optional: path to a demo users file (see demo-users.yaml.example in the
    # CDK app directory); empty = no seeding
    createDemoUsers: ""
    autoWireRedirectUrls:
      true # default on — a deploy-time custom resource points the OAuth
      # callback/logout URLs at this environment's CloudFront domain
    # Managed manually only when autoWireRedirectUrls is false:
    # callbackUrls:
    #   - "https://myapp.com/home"
    # logoutUrls:
    #   - "https://myapp.com/logout"
```

| Key                                        | Purpose                                                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws.account` / `aws.region`               | Optional explicit deploy target                                                                                                                                      |
| `global.environment`                       | **Required** environment slug scoping all stack ids and resource names                                                                                               |
| `frontend.s3.bucketName`                   | Optional override; default is `<resourcePrefix>-frontend`                                                                                                            |
| `datastore.dynamodb.tableName`             | Optional table-prefix override; default is the resource prefix                                                                                                       |
| `backend.environment.AccessTokenSecret`    | **Required** JWT signing secret — set by the deployer; `cdk synth`/`deploy` fails if empty (checked-in default is empty)                                             |
| `backend.memorySize` / `backend.timeout`   | Lambda memory (MB) and timeout (seconds) — applied to both the backend and query-processing Lambdas, and used as the async query queue visibility timeout            |
| `backend.environment.asyncQueryResultTtl`  | TTL (seconds) for async query results in the `asyncQueryResults` DynamoDB table; default `3600`                                                                      |
| `backend.features.*`                       | Feature flags passed into the backend Lambda environment                                                                                                             |
| `frontend.auth.provided`                   | Optional login hint in generated frontend `config.json`                                                                                                              |
| `auth.cognito.create`                      | Whether to create a Cognito user pool                                                                                                                                |
| `auth.cognito.createDemoUsers`             | Optional path to a demo users file (see `demo-users.yaml.example`); empty = no seeding                                                                               |
| `auth.cognito.autoWireRedirectUrls`        | When `true` (default), each deploy sets the OAuth callback/logout URLs to this environment's CloudFront domain; `false` manages them via `callbackUrls`/`logoutUrls` |
| `auth.cognito.callbackUrls` / `logoutUrls` | Cognito OAuth redirect URLs (used only when auto-wiring is disabled)                                                                                                 |
| `datastore.dynamodb.create`                | Whether to create DynamoDB cache tables                                                                                                                              |

### Enabling Cognito demo users

Seeding is **disabled by default**. To turn it on for a throwaway environment, copy `demo-users.yaml.example` (in the CDK app directory) to a git-ignored `demo-users.yaml` and set `auth.cognito.createDemoUsers` to its path. On every deploy the Auth stack seeds the listed users (verified email, permanent password), and the user list is a CloudFormation property, so editing the file re-runs the seeding on the next deploy — existing users keep their account and their password is reset from the file. `cdk synth` fails fast if the file is missing, invalid, or contains no valid users. Keep staged backend `rbac.yaml` aligned with those usernames.

Do not commit real passwords or access-token secrets into the checked-in CDK `config.yaml` (or the demo users file, which is git-ignored for the same reason).

### Mocks `config.yaml` highlights

```yaml
global:
  name: CodeMetricsMock
  environment: dev # required — scopes the CloudFormation stack id (e.g. CodeMetricsMock-dev)

mocks:
  lambdaAssetPath: "../../../dist/imposter-go-lambda"
  useAPIGW: true
  memorySize: 512
  timeout: 30
```

## Environments

Multiple named environments (e.g. `prod`, `dev`) can be deployed from the same configuration, even into the same AWS account, because every environment-scoped resource name is derived from `global.environment`.

- `global.environment` is **required** in both CDK apps and must match `^[a-z0-9]+(-[a-z0-9]+)*$` (values are lower-cased). Synth fails fast with a descriptive error when it is missing or invalid.
- Two prefixes are derived from `global.name` + `global.environment`:
  - `stackPrefix = <name>-<env>` (e.g. `CodeMetrics-dev`) — CloudFormation stack ids, Cognito pool/client names, AppRegistry name, Secrets Manager path.
  - `resourcePrefix = stackPrefix.toLowerCase()` (e.g. `codemetrics-dev`) — S3 bucket names and the DynamoDB table prefix (which the backend composes as `<tablePrefix>_<table>`).
- `frontend.s3.bucketName` and `datastore.dynamodb.tableName` remain **optional overrides**; when set they are used verbatim and must be unique per environment (S3 bucket names are globally unique across AWS).

| Resource                   | `prod`                                          | `dev`                                          |
| -------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| CFN stacks (native)        | `CodeMetrics-prod-<Stack>`                      | `CodeMetrics-dev-<Stack>`                      |
| CFN stack (mocks)          | `CodeMetricsMock-prod`                          | `CodeMetricsMock-dev`                          |
| S3 frontend bucket         | `codemetrics-prod-frontend`                     | `codemetrics-dev-frontend`                     |
| S3 CloudFront log bucket   | `codemetrics-prod-logging`                      | `codemetrics-dev-logging`                      |
| DynamoDB tables            | `codemetrics-prod_<table>`                      | `codemetrics-dev_<table>`                      |
| Backend `DATABASE_NAME`    | `codemetrics-prod`                              | `codemetrics-dev`                              |
| Cognito user pool / client | `CodeMetrics-prod-CognitoPool` / `-Client`      | `CodeMetrics-dev-CognitoPool` / `-Client`      |
| AppRegistry application    | `CodeMetrics-prod`                              | `CodeMetrics-dev`                              |
| Secrets Manager path (IAM) | `secret:CodeMetrics-prod/*`                     | `secret:CodeMetrics-dev/*`                     |
| Tags on every resource     | `Application: CodeMetrics`, `Environment: prod` | `Application: CodeMetrics`, `Environment: dev` |

### Deploying a specific environment

- The checked-in default is `environment: dev`, so a deploy without `CODEMETRICS_ENV` targets `dev`, never `prod`.
- Deploy a different environment without editing YAML via the `CODEMETRICS_ENV` environment variable (precedence: **env var > config file**). `make deploy-aws-cdk-*` targets pass it through automatically:

  ```bash
  cd deployment
  CODEMETRICS_ENV=prod make deploy-aws-cdk-mocks
  CODEMETRICS_ENV=prod make deploy-aws-cdk-native
  ```

- Teardown works the same way — `cdk destroy --all` only finds the stacks the current environment synthesises:

  ```bash
  cd deployment
  CODEMETRICS_ENV=dev make destroy-aws-cdk-native-all
  CODEMETRICS_ENV=dev make destroy-aws-cdk-mocks-all
  ```

- GitHub Actions: the [Demo instance deployment](./dev/demo-deployment.md) workflow deploys `prod` on pushes to `main`. Manual runs take a non-production `environment` slug and default to `dev`. The companion [Destroy workflow](./dev/demo-deployment.md#destroy-demoyaml) tears down one named non-production slug from `workflow_dispatch`; it shares the per-environment concurrency group and cannot target `dev` or `prod`.

### GitHub OIDC for team workflows

The CDK packages and release artifacts do not require consumers to copy the CodeMetrics demo workflow. Teams can implement their own workflow and use [`deployment/aws/oidc-trust-role/setup-oidc-trust-role.sh`](../deployment/aws/oidc-trust-role/README.md) to configure GitHub OIDC access to AWS.

The helper accepts the team's production slug and branch. For example:

```bash
deployment/aws/oidc-trust-role/setup-oidc-trust-role.sh \
  --repo owner/deployment-repo \
  --prod-environment live \
  --prod-branch release
```

The resulting trust policy permits the `live` STS role session only from `release`; other session names can be assumed from other branches in that repository. A consuming workflow must use the same environment expression for `role-session-name` and `CODEMETRICS_ENV`. No GitHub Environment object is required or created.

The role session name is caller-supplied, so this convention does not by itself provide AWS resource isolation. Use separate roles and resource-scoped policies when production and non-production require a hard IAM boundary.

## Deploy (native application)

Stage backend/frontend artifacts, then deploy:

```bash
cd deployment

# Build or download application artifacts, then stage config
make get-dev          # or: make get-release && make extract && make copy-config

# Customise deployment options
# edit deployment/aws/cdk/native/config.yaml

make deploy-aws-cdk-native
```

The CDK deployment publishes the React frontend and generates frontend `config.json` from the deployed API URL — no manual S3 upload is required.

Outputs are written to `deployment/native_output.json` (including the CloudFront URL).

## Deploy (mocks + demo app)

For a mock-backed demo (Imposter Go + rewritten remote-config URLs):

`build-imposter-go-lambda` downloads the pinned `imposter-go` release binary and the matching `plugin-oidc-server` plugin, then assembles them with the `mocks/` config into `deployment/dist/imposter-go-lambda`. No Go toolchain is required.

```bash
cd deployment
make build-imposter-go-lambda
make deploy-aws-cdk-mocks

MOCKS_BASE_URL="https://<mock-api-id>.execute-api.<region>.amazonaws.com/" make prepare-demo-config
make deploy-aws-cdk-native
```

Full CI/GitHub Actions and IAM details: [Demo instance deployment](./dev/demo-deployment.md).

## Teardown

`cdk destroy --all` only removes the stacks synthesised by the current `global.environment`, so set `CODEMETRICS_ENV` to the environment you want to tear down:

```bash
cd deployment
make destroy-aws-cdk-native-all           # default environment (dev)
CODEMETRICS_ENV=prod make destroy-aws-cdk-mocks-all   # tear down a prod deployment
```

Demo configs typically use `RemovalPolicy.DESTROY` for DynamoDB, S3, and Cognito so teardown is clean.

The GitHub Actions **Destroy** workflow is the guarded equivalent for custom non-production slugs. It inventories the selected stacks first, destroys native stacks before mocks, treats an already-absent environment as success, and leaves Secrets Manager values in place unless `delete_secrets` is selected. Owned secrets are names prefixed with `CodeMetrics-<slug>/` and no contradictory tags; deletion uses a 7-day recovery window. Shared `CodeMetrics/...` secrets are retained. See [Demo instance deployment — Destroy](./dev/demo-deployment.md#destroy-demoyaml).

## Related documentation

- [Deployment overview](./deployment.md)
- [AWS Lambda (SAM/zip) deployment](./deployment_lambda.md)
- [Demo instance deployment (CI + mocks)](./dev/demo-deployment.md)
- [Environment variables](./env_vars.md)
- [Authentication — Cognito](./authentication_cognito.md)
- Package READMEs: [native](../deployment/aws/cdk/native/README.md), [mocks](../deployment/aws/cdk/mocks/README.md)
