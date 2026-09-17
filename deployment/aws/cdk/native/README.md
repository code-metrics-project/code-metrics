# AWS CDK CodeMetrics Native Deployment

## Design

- Use `config.yaml` to customise the deployment (account/region, auth options, secrets, feature flags, URLs).
- Keep `cdk.json` for CDK feature-flag context only — deployment settings belong in `config.yaml`.
- Application config (`remote-config.yaml`, workloads, license, etc.) is **not** part of this package. Stage it into `deployment/dist/codemetrics-api/config` before deploy (for example via `make prepare-demo-config`).

### Default Components

- Backend Lambda (asset path from `backend.sourcePath`, typically `deployment/dist/codemetrics-api`)
- S3 Bucket for frontend static site
- CloudFront to expose the frontend
- Generated frontend `config.json` published with the frontend assets

### Optional Components for Deployment

- DynamoDB - Used to store Cache
  - KMS to encrypt DB
- Cognito - For authentication (`auth.cognito.create`)
  - Optional Cognito user seeding (`auth.cognito.createDemoUsers`, a path to a git-ignored users file)
  - AuthWiring stack — at each deploy, points the Cognito app client's OAuth callback/logout URLs at this environment's CloudFront domain (on by default, see below)

## Prerequisites

This package assumes:

- the backend artifact has already been staged into `deployment/dist/codemetrics-api`
- the React frontend artifact has already been staged into `deployment/dist/codemetrics-frontend`
- backend config and license files have been copied into `deployment/dist/codemetrics-api/config` by the caller

The deployment generates the frontend `config.json` automatically from the deployed API URL.

## Configuration highlights (`config.yaml`)

| Key                                        | Purpose                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws.account` / `aws.region`               | Optional explicit deploy target (otherwise CDK uses ambient credentials)                                                                                                                                            |
| `global.environment`                       | **Required** environment slug scoping stack ids and resource names (see below)                                                                                                                                      |
| `frontend.s3.bucketName`                   | Optional S3 bucket override; default `<resourcePrefix>-frontend`                                                                                                                                                    |
| `datastore.dynamodb.tableName`             | Optional DynamoDB table-prefix override; default the resource prefix                                                                                                                                                |
| `backend.environment.AccessTokenSecret`    | **Required** JWT signing secret — `cdk synth`/`deploy` fails if left empty (checked-in default is empty)                                                                                                            |
| `backend.memorySize` / `backend.timeout`   | Backend Lambda memory (MB) and timeout (seconds)                                                                                                                                                                    |
| `frontend.auth.provided`                   | Optional login hint published into frontend `config.json`                                                                                                                                                           |
| `auth.cognito.createDemoUsers`             | Optional path to a YAML file (see `demo-users.yaml.example`) whose `demoUsers` are seeded into Cognito on every deploy; empty = no seeding                                                                          |
| `auth.cognito.callbackUrls` / `logoutUrls` | Cognito OAuth redirect URLs used when auto-wiring is disabled                                                                                                                                                       |
| `auth.cognito.autoWireRedirectUrls`        | When `true` (default), a deploy-time custom resource sets the OAuth callback/logout URLs to this environment's CloudFront domain automatically; set `false` to manage them manually via `callbackUrls`/`logoutUrls` |

### Environments

`global.environment` (slug, e.g. `prod`, `dev`) is required and scopes every environment-specific resource name: stack ids use `<name>-<env>`, lower-cased resource names (S3 buckets, DynamoDB table prefix) use `<name>-<env>`.toLowerCase(). The `CODEMETRICS_ENV` environment variable overrides the config value (e.g. `CODEMETRICS_ENV=dev npx cdk deploy --all`), and a deploy overlay can set `global.environment` per run. See [docs/deployment_cdk.md — Environments](../../../../docs/deployment_cdk.md#environments) for the full naming table.

### Enabling Cognito demo users

Seeding is disabled unless `auth.cognito.createDemoUsers` points at a demo users file. Copy `demo-users.yaml.example` to a git-ignored `demo-users.yaml` (keep real passwords out of git) and reference it:

```yaml
auth:
  cognito:
    createDemoUsers: demo-users.yaml
```

On every deploy the Auth stack seeds the listed users into the Cognito pool (verified email, permanent password) and keeps the user list as a CloudFormation property, so editing the file re-runs the seeding on the next deploy. `cdk synth` fails fast if the file is missing, invalid, or contains no valid users.

Also set `backend.environment.AccessTokenSecret`, and keep staged backend `rbac.yaml` aligned with those usernames.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npm run deploy` deploy the stacks
- `npm run diff` compare deployed stack with current state
- `npm run synth` emit the synthesized CloudFormation template

## Cognito OAuth redirect URL auto-wiring

When `auth.cognito.create` and `frontend.create` are both enabled and `autoWireRedirectUrls` is not explicitly `false`, the deployment includes an `AuthWiring` stack. After each deploy its custom resource sets the app client's OAuth callback URL to `https://<cloudfront-domain>/login/callback` and logout URL to `https://<cloudfront-domain>/logout`, so OAuth login works for every environment without editing `config.yaml` after the first deploy. While auto-wiring is on, the static `callbackUrls`/`logoutUrls` values are left out of the Cognito client template (a stable placeholder is kept) so CloudFormation never resets the deploy-time values. Set `auth.cognito.autoWireRedirectUrls: false` to opt out and manage the URLs manually.

## Notes

- Cognito demo users are seeded only when `createDemoUsers` points at a demo users file; credentials come from that git-ignored file (or one provided by the deploy workflow), not from hardcoded Lambda source.
- Do not commit real secrets into the checked-in `config.yaml`.
