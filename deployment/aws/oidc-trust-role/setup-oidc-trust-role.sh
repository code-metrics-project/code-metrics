#!/usr/bin/env bash
#
# setup-oidc-trust-role.sh
#
# Sets up (or amends) the IAM role that GitHub Actions assumes via
# OIDC federation to deploy CodeMetrics to AWS.
#
# The generated trust policy treats the STS role session name as the
# deployment environment slug. The production session is restricted
# to the configured production branch. Other sessions may be assumed
# from any branch in the configured repository.
#
# The script is idempotent: the GitHub OIDC provider is created if it
# is missing from the account, and the role is created or updated.
#
# It is intended to be run locally by a user with AWS CLI credentials
# for the target account, not from CI.

set -euo pipefail

readonly OIDC_PROVIDER_URL="https://token.actions.githubusercontent.com"
readonly OIDC_PROVIDER_HOST="token.actions.githubusercontent.com"
# TLS certificate fingerprints for the GitHub OIDC provider, as
# published in the AWS GitHub Actions OIDC documentation.
readonly OIDC_FINGERPRINTS=(
  "6938fd4d081e2bd51fed3878b755bc2f085b2d37"
  "9e99a48a9960b14926bb7f3b02e22da2b0ab7280"
  "c6a9922274e6330f61186ce92dbdc7263c270464"
  "a031c010f70b983710c23f3d1962323fc2b0fb4b"
)

readonly DEFAULT_ROLE_NAME="CodeMetricsGitHubDeployRole"
readonly DEFAULT_REPO="DeloitteDigitalUK/code-metrics"
readonly DEFAULT_PROD_ENVIRONMENT="prod"
readonly DEFAULT_PROD_BRANCH="main"

role_name="${DEFAULT_ROLE_NAME}"
repo="${DEFAULT_REPO}"
prod_environment="${DEFAULT_PROD_ENVIRONMENT}"
prod_branch="${DEFAULT_PROD_BRANCH}"
account_id=""
output_file=""
dry_run=false
policy_file=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Sets up or amends the GitHub OIDC trust role for CodeMetrics AWS
deployments in the target account.

Options:
  --account-id <id>        AWS account id (default: looked up from the
                           current AWS CLI credentials)
  --role-name <name>       IAM role name (default: ${DEFAULT_ROLE_NAME})
  --repo <owner/name>      GitHub repository the tokens must come from.
                           Use owner@id/name@id if the repository emits
                           immutable subject claims (default: ${DEFAULT_REPO})
  --prod-environment <env> Production CDK slug and STS role session
                           name
                           (default: ${DEFAULT_PROD_ENVIRONMENT})
  --prod-branch <branch>   Branch allowed to assume the production
                           session (default: ${DEFAULT_PROD_BRANCH})
  --output-file <path>     Also write the trust policy to <path>
  --dry-run                Print the trust policy and the actions that
                           would be taken, without calling AWS
  --help                   Show this help
EOF
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

#######################################
# Parse command line arguments.
# Globals:
#   role_name repo prod_environment prod_branch account_id
#   output_file dry_run
# Arguments:
#   ...  script arguments
#######################################
parse_args() {
  while (( $# > 0 )); do
    case "$1" in
      --account-id)
        [[ $# -ge 2 ]] || die "--account-id requires a value"
        account_id="$2"
        shift 2
        ;;
      --role-name)
        [[ $# -ge 2 ]] || die "--role-name requires a value"
        role_name="$2"
        shift 2
        ;;
      --repo)
        [[ $# -ge 2 ]] || die "--repo requires a value"
        repo="$2"
        shift 2
        ;;
      --prod-environment)
        [[ $# -ge 2 ]] || die "--prod-environment requires a value"
        prod_environment="$2"
        shift 2
        ;;
      --prod-branch)
        [[ $# -ge 2 ]] || die "--prod-branch requires a value"
        prod_branch="$2"
        shift 2
        ;;
      --output-file)
        [[ $# -ge 2 ]] || die "--output-file requires a value"
        output_file="$2"
        shift 2
        ;;
      --dry-run)
        dry_run=true
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "unknown argument: $1"
        ;;
    esac
  done
}

#######################################
# Validate the parsed inputs; all values are interpolated into the
# JSON trust policy, so keep them to a safe character set.
# Globals:
#   role_name repo prod_environment prod_branch account_id
#######################################
validate_inputs() {
  [[ "${role_name}" =~ ^[A-Za-z0-9._-]+$ ]] \
    || die "--role-name contains invalid characters (got: ${role_name})"
  [[ "${repo}" =~ ^[A-Za-z0-9._-]+(@[0-9]+)?/[A-Za-z0-9._-]+(@[0-9]+)?$ ]] \
    || die "--repo must look like owner/name, optionally with immutable subject claim ids (owner@id/name@id) (got: ${repo})"
  [[ ${#prod_environment} -ge 2 && ${#prod_environment} -le 64 \
    && "${prod_environment}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] \
    || die "--prod-environment must be a 2-64 character CDK slug and valid STS role session name (got: ${prod_environment})"
  [[ "${prod_branch}" =~ ^[A-Za-z0-9._/-]+$ ]] \
    || die "--prod-branch contains invalid characters (got: ${prod_branch})"
  if [[ -n "${account_id}" ]]; then
    [[ "${account_id}" =~ ^[0-9]{12}$ ]] \
      || die "--account-id must be a 12 digit AWS account id (got: ${account_id})"
  fi
}

require_aws_cli() {
  command -v aws >/dev/null 2>&1 \
    || die "aws CLI not found on PATH; install it and configure credentials for the target account"
}

#######################################
# Fill in account_id when it was not supplied.
# Globals:
#   account_id dry_run
#######################################
resolve_account_id() {
  if [[ -n "${account_id}" ]]; then
    return 0
  fi
  if [[ "${dry_run}" == true ]]; then
    die "dry run makes no AWS calls, so --account-id is required"
  fi
  require_aws_cli
  account_id="$(aws sts get-caller-identity --query Account --output text)"
  [[ "${account_id}" =~ ^[0-9]{12}$ ]] \
    || die "could not resolve a 12 digit account id from the AWS CLI (got: ${account_id})"
}

#######################################
# Write the trust policy JSON to the given file.
# Globals:
#   account_id repo prod_environment prod_branch
# Arguments:
#   1  output file
#######################################
build_trust_policy() {
  local policy_target="$1"
  local provider_arn
  provider_arn="arn:aws:iam::${account_id}:oidc-provider"
  provider_arn="${provider_arn}/${OIDC_PROVIDER_HOST}"
  local branch_sub_prefix="repo:${repo}:ref:refs/heads/"
  local claim_aud="token.actions.githubusercontent.com:aud"
  local claim_sub="token.actions.githubusercontent.com:sub"

  cat > "${policy_target}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowProductionSessionFromProductionBranch",
      "Effect": "Allow",
      "Principal": {
        "Federated": "${provider_arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${claim_aud}": "sts.amazonaws.com",
          "${claim_sub}": "${branch_sub_prefix}${prod_branch}",
          "sts:RoleSessionName": "${prod_environment}"
        }
      }
    },
    {
      "Sid": "AllowNonProductionSessionsFromRepositoryBranches",
      "Effect": "Allow",
      "Principal": {
        "Federated": "${provider_arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${claim_aud}": "sts.amazonaws.com"
        },
        "StringLike": {
          "${claim_sub}": "${branch_sub_prefix}*"
        },
        "StringNotEquals": {
          "sts:RoleSessionName": "${prod_environment}"
        }
      }
    }
  ]
}
EOF
}

validate_json_file() {
  local file="$1"
  if command -v node >/dev/null 2>&1; then
    node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "${file}" \
      || die "generated trust policy is not valid JSON: ${file}"
  elif command -v jq >/dev/null 2>&1; then
    jq empty "${file}" \
      || die "generated trust policy is not valid JSON: ${file}"
  else
    log "Warning: neither node nor jq found; skipping JSON validation"
  fi
}

#######################################
# Create the GitHub OIDC provider in the account if it is missing.
#######################################
ensure_oidc_provider() {
  local providers
  providers="$(aws iam list-open-id-connect-providers --output text)"
  if [[ "${providers}" == *"${OIDC_PROVIDER_HOST}"* ]]; then
    log "OIDC provider for ${OIDC_PROVIDER_HOST} already exists"
    return 0
  fi

  local -a create_args=(
    iam
    create-open-id-connect-provider
    --url
    "${OIDC_PROVIDER_URL}"
    --client-id-list
    "sts.amazonaws.com"
    --thumbprint-list
  )
  local fingerprint
  for fingerprint in "${OIDC_FINGERPRINTS[@]}"; do
    create_args+=("${fingerprint}")
  done

  aws "${create_args[@]}"
  log "Created OIDC provider for ${OIDC_PROVIDER_HOST}"
}

#######################################
# Create the role, or update its trust policy if it already exists.
# Arguments:
#   1  trust policy file
#######################################
apply_trust_policy() {
  local trust_policy_file="$1"
  if aws iam get-role --role-name "${role_name}" >/dev/null 2>&1; then
    aws iam update-assume-role-policy \
      --role-name "${role_name}" \
      --policy-document "file://${trust_policy_file}"
    log "Updated the trust policy of existing role ${role_name}"
  else
    aws iam create-role \
      --role-name "${role_name}" \
      --assume-role-policy-document "file://${trust_policy_file}"
    log "Created role ${role_name} with the trust policy"
  fi
}

main() {
  parse_args "$@"
  validate_inputs
  resolve_account_id

  policy_file="$(mktemp "${TMPDIR:-/tmp}/codemetrics-oidc-trust.XXXXXX")"
  trap 'rm -f "${policy_file}"' EXIT

  build_trust_policy "${policy_file}"
  validate_json_file "${policy_file}"

  if [[ -n "${output_file}" ]]; then
    cp "${policy_file}" "${output_file}"
    log "Wrote trust policy to ${output_file}"
  fi

  log "Account:          ${account_id}"
  log "Role:             ${role_name} (arn:aws:iam::${account_id}:role/${role_name})"
  log "Repository:       ${repo}"
  log "Production slug:  ${prod_environment}"
  log "Production branch: ${prod_branch}"

  if [[ "${dry_run}" == true ]]; then
    log ""
    log "Dry run: no AWS changes were made. Actions that would be taken:"
    log "  - ensure the OIDC provider for ${OIDC_PROVIDER_HOST} exists"
    log "  - create role ${role_name} or update its trust policy"
    log ""
    log "Trust policy:"
    cat "${policy_file}"
    return 0
  fi

  require_aws_cli
  ensure_oidc_provider
  apply_trust_policy "${policy_file}"

  log ""
  log "Trust policy applied:"
  cat "${policy_file}"
  log ""
  log "Reminders:"
  log "  - Set the AWS_DEPLOY_ROLE_ARN GitHub secret to arn:aws:iam::${account_id}:role/${role_name}"
  log "  - Set role-session-name to the same slug passed to CODEMETRICS_ENV"
}

main "$@"
