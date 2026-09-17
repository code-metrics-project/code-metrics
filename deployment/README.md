# CodeMetrics Deployments

## Demo Mode

1. `make get-release` (downloads the latest release zip) or `make get-dev` (builds backend and frontend locally)
1. `make extract` - only needed after `make get-release`; unzips the release zip into directories in `deployment/dist`. `get-dev` assembles `dist/codemetrics-api` and `dist/codemetrics-frontend` directly, so `extract` is not needed (it is a no-op with no zip present).
1. `make deploy-aws-cdk-mocks` - builds `deployment/dist/imposter-go-lambda` (downloads the pinned `imposter-go` binary and `plugin-oidc-server` plugin, assembles them with the repo `mocks/` directory) and deploys the mocks stack, writing the `MockBaseUrl` output to `deployment/mocks_output.json`
1. `make prepare-demo-config` - copies demo-safe config into `deployment/dist/config/api` using backend examples plus the mock remote config, then rewrites mock-backed URLs. Requires `deployment/mocks_output.json` (from step 3) or an exported `MOCKS_BASE_URL`; it fails if neither is present.
1. Update `deployment/aws/cdk/native/config.yaml` to set deployment options (account/region, secrets, auth). The checked-in default is the dev demo config: `AccessTokenSecret: "demo"` and Cognito demo-user seeding enabled from a git-ignored `demo-users.yaml` — copy `demo-users.yaml.example` to `demo-users.yaml` to keep seeding, or set `auth.cognito.createDemoUsers` to empty to disable it. Cognito OAuth redirect URL auto-wiring is **on** by default (`auth.cognito.autoWireRedirectUrls`): each deploy points the app client's callback/logout URLs at that environment's CloudFront domain automatically.
1. `make deploy-aws-cdk-native`
1. Open the CloudFront URL from `deployment/native_output.json`

Use the `make` targets above rather than `cdk deploy` / `npm run deploy` directly inside `deployment/aws/cdk/...` — direct deploys skip the artifact builds above. On a fresh clone the mocks stack then fails with an empty Lambda zip, and the native stack deploys whatever (possibly stale or missing) artifacts already sit in `deployment/dist/`.

The output files are single-slot: each `make deploy-aws-cdk-*` run overwrites `deployment/mocks_output.json` / `deployment/native_output.json`, so the CloudFront URL you read reflects the **last** deployment, not necessarily the environment you are looking at. With `prod` and `dev` side by side, pass a distinct `--outputs-file` per environment if you need both.

Environments are selected by `global.environment` in each CDK `config.yaml` (default `dev`). To deploy or tear down a specific environment, set `CODEMETRICS_ENV` explicitly, for example:

```bash
CODEMETRICS_ENV=dev make deploy-aws-cdk-mocks
CODEMETRICS_ENV=dev make prepare-demo-config
CODEMETRICS_ENV=dev make deploy-aws-cdk-native
CODEMETRICS_ENV=dev make destroy-aws-cdk-native-all
```

Stack ids and resource names are prefixed accordingly (e.g. `CodeMetrics-dev-AppStack`, `CodeMetricsMock-dev`). See [docs/deployment_cdk.md — Environments](../docs/deployment_cdk.md#environments).

The native CDK backend packages the Lambda from `deployment/dist/codemetrics-api`. During synth, it re-syncs the staged API config from `deployment/dist/config/api` into that bundled backend directory before creating the Lambda asset, so edits to the staged app config are included in the next deploy.

Application config is provided by the caller via `deployment/dist/` — it is not stored inside `deployment/aws/cdk/`.

If you enable Cognito demo users in `config.yaml` (`auth.cognito.createDemoUsers`), keep staged `rbac.yaml` aligned with the users in the demo users file.

Backend feature flags for the native deployment are controlled in `deployment/aws/cdk/native/config.yaml` under `backend.features`.
Set each flag explicitly for the demo stack: `dora`, `languageSelector`, `mlForecasts`, `predictions`, and `temporalCoupling`.

## AWS CDK Native

1. Place config and licence for backend in `deployment/dist/config`
1. `make get-release` - Downloads the latest release
1. `make extract` - Extracts to directories in deployment/dist
1. `make copy-config` - Copies config into correct dir
1. Update `deployment/aws/cdk/native/config.yaml` to set deployment options
1. `make deploy-aws-cdk-native`
1. No manual frontend upload is required; the CDK deployment publishes the React frontend and generated `config.json`

## GitHub OIDC Deploy Role

Teams deploying the released artifacts from their own GitHub Actions workflows can use [`aws/oidc-trust-role`](aws/oidc-trust-role/) to create or amend an IAM deploy role. The helper is independent of this repository's demo workflow.

The production CDK slug and production branch are configurable. The policy uses the STS role session name to classify the requested environment, so workflows must pass the same slug to `role-session-name` and `CODEMETRICS_ENV`. This does not create or use GitHub Environment objects.

```bash
deployment/aws/oidc-trust-role/setup-oidc-trust-role.sh \
	--repo owner/deployment-repo \
	--prod-environment production \
	--prod-branch release
```

The script is idempotent and intended for a locally authenticated AWS user. See [aws/oidc-trust-role/README.md](aws/oidc-trust-role/README.md) for the workflow contract, options, dry-run mode, and tests.
