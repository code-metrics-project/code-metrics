# Demo Instance Deployment

This guide covers deploying the CodeMetrics **demo** instance to AWS using CDK: mock data providers plus the native application stacks. For the general CDK deployment guide (config reference, native-only deploy, teardown), see [Deployment with AWS CDK](../deployment_cdk.md).

The demo uses mock data providers (Sonar, Jira, GitHub, Azure DevOps, etc.) served by an Imposter Go Lambda, with three preconfigured workloads: Athena, Gaia, and Icarus.

> **Note**: Parts of this documentation were generated with AI assistance.

## Architecture

The deployment consists of two CDK applications:

- **Mocks stack** (`deployment/aws/cdk/mocks`) — Imposter Go Lambda behind API Gateway, serving mock API responses for all configured data providers.
- **Native stack** (`deployment/aws/cdk/native`) — the CodeMetrics application: backend Lambda, frontend on S3/CloudFront, Cognito auth, and DynamoDB tables.

The native stack's application config is staged at deploy time (not stored inside the CDK package). Mock provider URLs in `remote-config.yaml` are rewritten to the mocks API Gateway endpoint.

## Configuration

### CDK infrastructure (`deployment/aws/cdk/native/config.yaml`)

The checked-in config is pre-set for the dev demo environment; override locally for other targets:

| Setting                                 | Checked-in value  | Notes                                                |
| --------------------------------------- | ----------------- | ---------------------------------------------------- |
| `backend.environment.AccessTokenSecret` | `"demo"`          | Placeholder — replace for non-demo deployments       |
| `auth.cognito.createDemoUsers`          | `demo-users.yaml` | Seeds Cognito from the git-ignored `demo-users.yaml` |
| `frontend.auth.provided`                | unset             | Optional login hint in frontend `config.json`        |

Full key reference: [Deployment with AWS CDK — Configuration](../deployment_cdk.md#configuration-configyaml).

### Application config (staged into `deployment/dist/`)

`make prepare-demo-config` stages mock demo config (backend examples + `mocks/config/remote-config.yaml`) and rewrites mock URLs to the deployed mocks base URL. That staged tree is what the backend Lambda asset consumes — CDK only points `backend.sourcePath` at `deployment/dist/codemetrics-api`.

The GitHub Actions demo workflow (`.github/workflows/deploy-demo.yaml`) may apply additional overlays at deploy time:

- CDK demo overlay from `.github/demo-config/cdk-native-overlay.yaml` (Cognito demo users / access token for the throwaway demo)
- Application dogfood config checked out from `DeloitteDigitalUK/code-metrics-config` (not stored in this repository), including GitHub App servers and optional `llm` (AI Summaries) config merged into the staged `remote-config.yaml`

Those workflow helpers are excluded from the open-source downstream sync.

## GitHub Actions Workflows

### `deploy-demo.yaml`

Deploys both stacks. Relevant pushes to `main` deploy `prod`; the workflow can also run manually via `workflow_dispatch` for non-production environments. The build job installs backend dependencies with `npm ci` and frontend dependencies with `bun install --frozen-lockfile` (matching `deployment/Makefile` `get-dev`).

Manual dispatch inputs:

- `environment` — non-production target slug used to identify the stacks and resources being deployed, such as `dev`, `qa`, or `demo-eu` (default: `dev`)
- `deploy_mocks` — whether to deploy the mocks stack (default: true)
- `deploy_app` — whether to deploy the application stack (default: true)

Environment behaviour:

- A push to `main` always deploys `prod`. Manual runs deploy the requested non-production slug from any branch and reject `prod`; an omitted or empty slug falls back to `dev`.
- The resolved `environment` slug is written into both CDK `config.yaml` files (`global.environment`) via the `set-env` overlay mode. CDK uses it in stack/resource names and environment tags.
- A per-environment `concurrency` group (`deploy-<env>`) serialises overlapping runs of the _same_ environment while different environments stay parallel.
- All environments share the same AWS account and the existing `AWS_DEPLOY_ROLE_ARN` — no new secret is required. Environments in _different_ accounts would need a separate deploy role/ARN per account.
- Deployment slugs are not GitHub Environments. Deploy jobs retain branch-based OIDC subjects, and the IAM trust policy allows branch subjects from this repository without changing the repository-wide OIDC subject template.
- The step summary prints the environment plus the deployed URLs (CloudFront, API, mock base URL).

Cognito OAuth redirect URLs are wired automatically: on every deploy, the `AuthWiring` stack points the app client's callback/logout URLs at that environment's CloudFront domain (`auth.cognito.autoWireRedirectUrls` defaults to `true`). No post-deploy config edit is needed; set it to `false` in the config or an overlay to manage `callbackUrls`/`logoutUrls` manually.

### `destroy-demo.yaml`

Tears down one named demo environment from `workflow_dispatch`. Use this for custom slugs created by a manual Deploy run. It does not run on push.

Manual dispatch inputs:

- `environment` — slug to destroy, such as `qa` or `demo-eu`. `dev` and `prod` are rejected.
- `confirm_environment` — must match `environment` after trim and lower-case. A mismatch fails the job before AWS credentials are requested.
- `delete_config` — also delete `environments/<slug>` from a checkout of `DeloitteDigitalUK/code-metrics-config` and push that removal. Default: false.
- `delete_secrets` — also delete Secrets Manager entries that are unambiguously owned by the slug. Default: false.

Safety behaviour:

- The guard job normalises the slug with the same `^[a-z0-9]+(-[a-z0-9]+)*$` rules as deploy, then rejects `dev` and `prod` including case and whitespace variants. It does not call `configure-aws-credentials`.
- The teardown job uses GitHub OIDC with `role-session-name` set to the normalised slug, matching the Deploy workflow. Jobs do not declare a GitHub Environment object, because that replaces the branch OIDC subject and is denied by the current trust policy.
- Concurrency group `deploy-<environment>` is the same group Deploy uses, so a deploy and a destroy for the same slug cannot overlap. Use the same lower-case slug you deployed; GitHub evaluates the group from the raw input before normalisation.
- Native CloudFormation stacks (`CodeMetrics-<slug>-*`) are deleted before `CodeMetricsMock-<slug>`. Stacks that are already absent are reported as `not_found` and the job still succeeds.
- The pre-destroy inventory is written to the job summary, including stacks, associated secrets, and the aligned config directory when the config repo checkout is available.

Secrets Manager:

- Discovery looks for names prefixed with `CodeMetrics-<slug>/` and for the `Environment=<slug>` tag, then classifies each secret locally. A broad substring match is not enough to delete.
- Owned secrets have that exact name prefix and no contradictory `Environment` or `Application` tag.
- Tagged-but-unprefixed names (including shared `CodeMetrics/...` secrets) are retained and listed with the reason.
- Deletion is off unless `delete_secrets` is true. Deleted secrets use a 7-day recovery window; the workflow does not force-delete.

Configuration:

- Aligned config means `environments/<slug>/` in `DeloitteDigitalUK/code-metrics-config`.
- The directory is reported when the config repo can be checked out. It is deleted only when `delete_config` is true.
- Config deletion commits and pushes `chore/remove-<slug>-config` on that repository. The `CODE_METRICS_CONFIG_REPO_TOKEN` secret needs write access for that step; stack teardown still runs if you leave `delete_config` false.

`.github/workflows/destroy-demo.yaml` is excluded from the open-source downstream fork sync with the other demo workflow files.

`.github/workflows/deploy-demo.yaml`, `.github/workflows/destroy-demo.yaml`, and `.github/demo-config/` are excluded from the open-source downstream fork sync (`scripts/downstream-fork/rsync-excludes.txt`).

> **Migration note (legacy single environment)**: environments were introduced with environment-scoped resource names, and the old un-suffixed stacks (`CodeMetrics-AppStack`, `CodeMetrics-Datastore`, `CodeMetrics-Auth`, `CodeMetrics-Backend`, `CodeMetrics-Frontend`, `MocksStack`) are **not** destroyed by the new code. Once `prod` and `dev` are both healthy, destroy the legacy stacks explicitly with `aws cloudformation delete-stack`, then delete any surviving orphans (S3 bucket `codemetrics-staging`, DynamoDB tables `CodeMetrics_*`, Cognito pool `CodeMetrics-CognitoPool`, AppRegistry application `CodeMetrics`). The AppRegistry application can only be deleted after AppStack removal.

## Required GitHub Configuration

### Secrets

| Secret                           | Description                                                                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`            | ARN of the IAM role for GitHub Actions OIDC federation (e.g. `arn:aws:iam::926960811297:role/GitHubActionsCDKDeployRole`)                                                                                                    |
| `CODE_METRICS_CONFIG_REPO_TOKEN` | GitHub token (PAT or fine-grained) with read access to private `DeloitteDigitalUK/code-metrics-config` so the workflow can merge dogfood app config. Write access is required only when Destroy is run with `delete_config`. |

### Variables

| Variable     | Description               | Default     |
| ------------ | ------------------------- | ----------- |
| `AWS_REGION` | AWS region for deployment | `eu-west-2` |

### IAM Role Requirements

The `AWS_DEPLOY_ROLE_ARN` role must:

1. **Trust the GitHub OIDC provider** - run [`deployment/aws/oidc-trust-role/setup-oidc-trust-role.sh`](../../deployment/aws/oidc-trust-role/README.md) to create or update the IAM trust policy. It allows branch subjects from this repository, rejects environment, tag, and pull-request subjects, and pins `aud` to `sts.amazonaws.com`. The script does not customize the repository OIDC subject template. Strict AWS-level isolation between production and non-production requires separate roles with resource-scoped permissions.

2. **Have permissions for**:
   - CloudFormation (create/update/delete stacks, change sets)
   - Lambda (create/update functions, manage function URLs)
   - API Gateway (create/manage HTTP APIs)
   - S3 (create buckets, upload objects for frontend and CDK assets)
   - CloudFront (create/update distributions)
   - DynamoDB (create/manage tables)
   - Cognito (create/manage user pools)
   - IAM (create roles and policies for Lambda execution)
   - KMS (create/manage keys for DynamoDB encryption)
   - Logs (create log groups)
   - Secrets Manager (read secrets; delete only when Destroy is run with `delete_secrets`)
   - SSM (CDK bootstrap parameter store lookups)

   A practical starting point is the `AdministratorAccess` managed policy scoped to the deploy account, then narrowing permissions as needed.

3. **CDK bootstrap** — the target account and region must be CDK-bootstrapped:
   ```bash
   npx cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

## Manual Deployment

### Prerequisites

- AWS CLI configured with credentials for the target account
- Node.js 20+
- CDK CLI (`npm install -g aws-cdk`)

### Deploy Mocks

```bash
cd deployment

# Download the Imposter Go binary and plugin, and assemble the Lambda package
make build-imposter-go-lambda

# Deploy the mocks CDK stack
make deploy-aws-cdk-mocks
```

This outputs `mocks_output.json` with the mock API Gateway URL.

### Deploy Application

```bash
cd deployment

# Build backend and frontend
make get-dev

# Stage demo config and rewrite URLs to point at mocks
MOCKS_BASE_URL="https://<mock-api-id>.execute-api.eu-west-2.amazonaws.com/" make prepare-demo-config

# Configure CDK config.yaml (AccessTokenSecret, Cognito demo users via the
# git-ignored demo-users.yaml; Cognito OAuth redirect URLs are wired
# automatically unless auth.cognito.autoWireRedirectUrls is false)
# edit deployment/aws/cdk/native/config.yaml

# Build prepopulate + auth wiring Lambdas and deploy native stack
make deploy-aws-cdk-native
```

### Imposter Go Version

The mocks Lambda runs the released `imposter-go` Linux binary (`IMPOSTER_GO_VERSION` in `deployment/Makefile` and `.github/workflows/deploy-demo.yaml`), together with the matching `plugin-oidc-server` plugin from `imposter-project/imposter-go-plugins`. Both are downloaded from their GitHub releases, so no Go toolchain is needed to build the deployment artefact.

Keep the two `IMPOSTER_GO_VERSION` values in step when upgrading, and make sure the plugin release exists for the same tag.

Versions before 5.21.1 dropped query parameters when translating API Gateway and Function URL events into the internal HTTP request ([imposter-go#96](https://github.com/imposter-project/imposter-go/issues/96)), which broke `queryParams` route matching and left `context.request.queryParams` empty in mock scripts. Do not downgrade below 5.21.1.

## Teardown

`cdk destroy --all` only removes the stacks of the environment currently configured (or set via `CODEMETRICS_ENV`):

```bash
cd deployment
make destroy-aws-cdk-native-all
make destroy-aws-cdk-mocks-all

# tear down a custom deployment instead
CODEMETRICS_ENV=qa make destroy-aws-cdk-native-all
CODEMETRICS_ENV=qa make destroy-aws-cdk-mocks-all
```

Note: DynamoDB tables, S3 buckets, and Cognito user pools are configured with `RemovalPolicy.DESTROY` in the demo config, so teardown is clean.

To tear down a named non-production environment from GitHub Actions, run the **Destroy** workflow (`.github/workflows/destroy-demo.yaml`). Re-type the slug to confirm. `dev` and `prod` are rejected before AWS authentication. Config and Secrets Manager cleanup stay off unless you enable those inputs. See [Destroy workflow](#destroy-demoyaml) above for permissions, recovery, and retained-resource rules.
