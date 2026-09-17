# GitHub OIDC Trust Role Setup

One-time (re-runnable) setup for the IAM role that GitHub Actions assumes via [OIDC federation](https://docs.github.com/en/actions/deployment/security-hardening/restricting-access-to-github-actions-oidc) to deploy CodeMetrics to AWS. This replaces the trust policy that was previously created by hand in the IAM console.

## What the trust policy enforces

`setup-oidc-trust-role.sh` prepares an IAM role for teams deploying the released CodeMetrics artifacts with their own GitHub Actions workflow. It does not depend on the CodeMetrics repository's demo workflow.

The policy treats the STS role session name as the deployment environment slug. Defaults are `prod` for production and `main` for the production branch, and both are configurable:

| Request                                                                | Assumed? |
| ---------------------------------------------------------------------- | -------- |
| session `prod` from branch `main`                                      | yes      |
| session `prod` from another branch                                     | no       |
| any session other than `prod` from a branch in the configured repo     | yes      |
| GitHub Environment, tag, pull-request, or another repository's subject | no       |

For example, a team that calls production `live` and deploys it from `release` runs the helper with `--prod-environment live --prod-branch release`. Their workflow must then pass the selected slug to both `role-session-name` and `CODEMETRICS_ENV`.

This does not use GitHub Environments. Jobs must not declare the GitHub Actions `environment:` key because it replaces the branch in GitHub's default OIDC subject.

> **Security boundary:** `role-session-name` is supplied by the caller. The trust policy prevents the configured production session name from being assumed on another branch, but IAM cannot prove that the subsequent CDK process received the same `CODEMETRICS_ENV` value. Keep those values sourced from one workflow expression. Strict AWS resource isolation requires separate roles with resource-scoped permissions.

> **Immutable subject claims:** the script generates the legacy name-only `sub` form (`repo:<owner>/<repo>:ref:...`), which is what this repository emits today (it was created before 15 July 2026 and has not opted in). If the organisation or repository ever [opts in to immutable subject claims](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/), or the repo/org is renamed or transferred, GitHub switches tokens to `repo:<owner>@<org-id>/<repo>@<repo-id>:ref:...` and name-only conditions stop matching (role assumption fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`). When that happens, re-run the script with the immutable prefix, e.g. `./setup-oidc-trust-role.sh --repo 'DeloitteDigitalUK@123456/code-metrics@789012'`. The repository's exact claim prefix can be checked in the repository's OIDC settings or by inspecting a token.

## Prerequisites

- AWS CLI v2, configured with credentials for the **target account** (the script is intended for a locally authed user, not CI)
- `node` or `jq` on `PATH` (used to validate the generated policy; the script warns and continues if neither is present)

## Usage

```bash
cd deployment/aws/oidc-trust-role

# Preview the trust policy and the actions that would be taken
./setup-oidc-trust-role.sh --dry-run --account-id <account-id>

# Create the role (or update its trust policy) for real
./setup-oidc-trust-role.sh
```

The account id defaults to the one from the current AWS CLI credentials (`aws sts get-caller-identity`). The script is idempotent: it creates the GitHub OIDC provider (`token.actions.githubusercontent.com`, with the standard GitHub TLS certificate thumbprints) if it is missing, creates the role if it is missing, and otherwise updates the existing role's trust policy.

### Options

| Option                     | Default                          | Description                                                                                                          |
| -------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--account-id <id>`        | looked up from AWS CLI           | 12 digit AWS account id                                                                                              |
| `--role-name <name>`       | `CodeMetricsGitHubDeployRole`    | IAM role to create or amend                                                                                          |
| `--repo <owner/name>`      | `DeloitteDigitalUK/code-metrics` | GitHub repository the tokens must come from; use `owner@id/name@id` if the repository emits immutable subject claims |
| `--prod-environment <env>` | `prod`                           | Production CDK slug and required STS role session name                                                               |
| `--prod-branch <branch>`   | `main`                           | Branch allowed to assume the production session                                                                      |
| `--output-file <path>`     | -                                | Also write the trust policy to a file                                                                                |
| `--dry-run`                | -                                | Print policy and intended actions without calling AWS                                                                |
| `--help`                   | -                                | Show usage                                                                                                           |

Examples:

```bash
# Dry run against a specific account
./setup-oidc-trust-role.sh --dry-run --account-id 926960811297

# Save the policy for audit before applying it
./setup-oidc-trust-role.sh --output-file /tmp/trust-policy.json

# A different repository with team-specific production conventions
./setup-oidc-trust-role.sh \
  --repo octo/demo \
  --prod-environment live \
  --prod-branch release
```

## After running

1. Point the `AWS_DEPLOY_ROLE_ARN` GitHub secret at the role, e.g. `arn:aws:iam::926960811297:role/CodeMetricsGitHubDeployRole`.
2. Grant the role only the AWS permissions required by the CDK deployment.
3. In the team's workflow, use one validated slug for the STS session and CDK deployment:

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: aws-actions/configure-aws-credentials@v6
    with:
      role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
      role-session-name: ${{ inputs.environment }}
      aws-region: ${{ vars.AWS_REGION }}

  - name: Deploy CodeMetrics
    env:
      CODEMETRICS_ENV: ${{ inputs.environment }}
    run: make deploy-aws-cdk-native
```

The selected slug must follow the CDK format `^[a-z0-9]+(-[a-z0-9]+)*$` and be between 2 and 64 characters so it is also a valid STS role session name.

See [Deployment with AWS CDK](../../../docs/deployment_cdk.md) for artifact staging and CDK configuration.

## Tests

```bash
./test-setup-oidc-trust-role.sh
```

The tests run the script against a fake `aws` executable, so they never touch a real AWS account.
