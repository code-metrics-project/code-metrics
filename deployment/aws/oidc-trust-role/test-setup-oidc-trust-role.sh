#!/usr/bin/env bash
#
# test-setup-oidc-trust-role.sh
#
# Tests for setup-oidc-trust-role.sh. A fake `aws` executable is put
# on PATH so no real AWS account is ever touched.
#
# Run from this directory:
#   ./test-setup-oidc-trust-role.sh

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SETUP_SCRIPT="${script_dir}/setup-oidc-trust-role.sh"

test_dir="$(mktemp -d "${TMPDIR:-/tmp}/cm-oidc-trust-test.XXXXXX")"
trap 'rm -rf "${test_dir}"' EXIT

pass_count=0
fail_count=0

pass() {
  pass_count=$((pass_count + 1))
  printf 'PASS: %s\n' "$1"
}

fail() {
  fail_count=$((fail_count + 1))
  printf 'FAIL: %s\n' "$1" >&2
}

expect_ok() {
  local description="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    pass "${description}"
  else
    fail "${description} (expected exit 0)"
  fi
}

expect_fail() {
  local description="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "${description} (expected non-zero exit)"
  else
    pass "${description}"
  fi
}

expect_output_contains() {
  local description="$1"
  local expected="$2"
  shift 2
  local output
  output="$("$@" 2>&1)" || {
    fail "${description} (command failed)"
    return 0
  }
  if [[ "${output}" == *"${expected}"* ]]; then
    pass "${description}"
  else
    fail "${description} (missing output: ${expected})"
  fi
}

expect_output_not_contains() {
  local description="$1"
  local unexpected="$2"
  shift 2
  local output
  output="$("$@" 2>&1)" || {
    fail "${description} (command failed)"
    return 0
  }
  if [[ "${output}" == *"${unexpected}"* ]]; then
    fail "${description} (unexpected output: ${unexpected})"
  else
    pass "${description}"
  fi
}

#######################################
# Install a fake aws CLI that logs its invocations to FAKE_AWS_LOG and
# behaves according to FAKE_AWS_ROLE_EXISTS / FAKE_AWS_PROVIDER_PRESENT.
# The fake appends the referenced trust policy file to the log so tests
# can assert on the policy that would have been sent to IAM.
#######################################
fake_bin_dir="${test_dir}/bin"
mkdir -p "${fake_bin_dir}"
cat > "${fake_bin_dir}/aws" <<'FAKE_AWS'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "${FAKE_AWS_LOG:?FAKE_AWS_LOG not set}"

cmd="${1:-} ${2:-}"
case "${cmd}" in
  "sts get-caller-identity")
    echo "012345678901"
    ;;
  "iam list-open-id-connect-providers")
    if [[ "${FAKE_AWS_PROVIDER_PRESENT:-0}" == "1" ]]; then
      echo "arn:aws:iam::012345678901:oidc-provider/token.actions.githubusercontent.com"
    fi
    ;;
  "iam get-role")
    if [[ "${FAKE_AWS_ROLE_EXISTS:-0}" == "1" ]]; then
      echo '{"Role":{"RoleName":"fake"}}'
    else
      echo "EntityDoesNotExistException: role not found" >&2
      exit 255
    fi
    ;;
  "iam create-open-id-connect-provider" | "iam create-role" | "iam update-assume-role-policy")
    policy_doc=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --assume-role-policy-document | --policy-document)
          policy_doc="$2"
          shift 2
          ;;
        *)
          shift
          ;;
      esac
    done
    if [[ -n "${policy_doc}" && "${policy_doc}" == file://* ]]; then
      cat "${policy_doc#file://}" >> "${FAKE_AWS_LOG:?FAKE_AWS_LOG not set}"
    fi
    ;;
  "iam update-role")
    echo "Unknown options: --assume-role-policy-document" >&2
    exit 252
    ;;
esac
exit 0
FAKE_AWS
chmod +x "${fake_bin_dir}/aws"

aws_log="${test_dir}/aws.log"

#######################################
# Reset the fake aws state before a test.
# Arguments:
#   1  role exists marker (0/1, default 0)
#   2  provider present marker (0/1, default 1)
#######################################
reset_fake_aws() {
  : > "${aws_log}"
  FAKE_AWS_ROLE_EXISTS="${1:-0}"
  FAKE_AWS_PROVIDER_PRESENT="${2:-1}"
  export FAKE_AWS_ROLE_EXISTS FAKE_AWS_PROVIDER_PRESENT
}

run_setup() {
  env PATH="${fake_bin_dir}:${PATH}" FAKE_AWS_LOG="${aws_log}" \
    "${SETUP_SCRIPT}" "$@"
}

log_has() {
  grep -q -- "$1" "${aws_log}"
}

echo "== setup-oidc-trust-role.sh tests =="
echo ""

# --- help and dry-run (no AWS calls) ---
expect_ok "--help exits 0" "${SETUP_SCRIPT}" --help
expect_output_contains "--help prints usage" "Usage:" "${SETUP_SCRIPT}" --help
expect_output_contains "--help documents production slug option" \
  "--prod-environment <env>" "${SETUP_SCRIPT}" --help
expect_output_contains "--help documents production branch option" \
  "--prod-branch <branch>" "${SETUP_SCRIPT}" --help

expect_ok "dry-run exits 0" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run banner" \
  "Dry run: no AWS changes were made" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run shows federated principal" \
  "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run pins the production branch" \
  "repo:DeloitteDigitalUK/code-metrics:ref:refs/heads/main" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run allows non-production branch subjects" \
  "repo:DeloitteDigitalUK/code-metrics:ref:refs/heads/*" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run classifies production by role session name" \
  '"sts:RoleSessionName": "prod"' \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run excludes production from non-production sessions" \
  '"StringNotEquals"' \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_contains "dry-run keeps the aud check" \
  '"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"' \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_not_contains "dry-run denies GitHub environment subjects" \
  ":environment:" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_not_contains "dry-run denies pull-request subjects" \
  ":pull_request" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012
expect_output_not_contains "dry-run denies tag subjects" \
  ":ref:refs/tags/" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012

# --- JSON validity of the generated policy ---
if command -v node >/dev/null 2>&1 || command -v jq >/dev/null 2>&1; then
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 \
    --output-file "${test_dir}/policy.json" >/dev/null 2>&1
  if command -v node >/dev/null 2>&1; then
    if node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' \
      "${test_dir}/policy.json"; then
      pass "generated trust policy is valid JSON"
    else
      fail "generated trust policy is valid JSON"
    fi
  else
    if jq empty "${test_dir}/policy.json"; then
      pass "generated trust policy is valid JSON"
    else
      fail "generated trust policy is valid JSON"
    fi
  fi
else
  echo "SKIP: neither node nor jq available, JSON validity not checked"
fi

# --- full run: role exists -> update-assume-role-policy ---
reset_fake_aws 1 1
expect_ok "run with existing role exits 0" run_setup
if log_has "iam update-assume-role-policy --role-name CodeMetricsGitHubDeployRole"; then
  pass "existing role gets update-assume-role-policy"
else
  fail "existing role gets update-assume-role-policy"
fi
if log_has "iam create-role"; then
  fail "existing role must not get create-role"
else
  pass "existing role must not get create-role"
fi
if log_has "AllowProductionSessionFromProductionBranch" \
  && log_has "AllowNonProductionSessionsFromRepositoryBranches"; then
  pass "trust policy is sent with the role update"
else
  fail "trust policy is sent with the role update"
fi
if log_has "iam create-open-id-connect-provider"; then
  fail "existing provider must not be recreated"
else
  pass "existing provider must not be recreated"
fi

# --- full run: role missing -> create-role ---
reset_fake_aws 0 1
expect_ok "run with missing role exits 0" run_setup
if log_has "iam create-role --role-name CodeMetricsGitHubDeployRole"; then
  pass "missing role gets create-role"
else
  fail "missing role gets create-role"
fi
if log_has "iam update-assume-role-policy"; then
  fail "missing role must not get update-assume-role-policy"
else
  pass "missing role must not get update-assume-role-policy"
fi

# --- full run: provider missing -> provider created ---
reset_fake_aws 1 0
expect_ok "run with missing provider exits 0" run_setup
if log_has "iam create-open-id-connect-provider"; then
  pass "missing provider gets created"
else
  fail "missing provider gets created"
fi
if log_has "--client-id-list sts.amazonaws.com" \
  && log_has "--thumbprint-list" \
  && log_has "6938fd4d081e2bd51fed3878b755bc2f085b2d37" \
  && log_has "9e99a48a9960b14926bb7f3b02e22da2b0ab7280" \
  && log_has "c6a9922274e6330f61186ce92dbdc7263c270464" \
  && log_has "a031c010f70b983710c23f3d1962323fc2b0fb4b"; then
  pass "provider created with audience and all thumbprints"
else
  fail "provider created with audience and all thumbprints"
fi

# --- full run: account id resolved from credentials ---
reset_fake_aws 1 1
expect_ok "run without --account-id exits 0" run_setup
if log_has "sts get-caller-identity"; then
  pass "account id resolved via sts get-caller-identity"
else
  fail "account id resolved via sts get-caller-identity"
fi
if log_has "arn:aws:iam::012345678901:oidc-provider"; then
  pass "trust policy uses the resolved account id"
else
  fail "trust policy uses the resolved account id"
fi

# --- full run: custom parameters ---
reset_fake_aws 1 1
expect_ok "run with custom parameters exits 0" \
  run_setup --repo octo/demo --prod-environment live \
  --prod-branch release --role-name CustomRole
if log_has "repo:octo/demo:ref:refs/heads/release"; then
  pass "custom production branch in production statement"
else
  fail "custom production branch in production statement"
fi
if log_has "repo:octo/demo:ref:refs/heads/*"; then
  pass "custom repo in non-production statement"
else
  fail "custom repo in non-production statement"
fi
if log_has '"sts:RoleSessionName": "live"'; then
  pass "custom production slug used as role session name"
else
  fail "custom production slug used as role session name"
fi
if log_has "iam update-assume-role-policy --role-name CustomRole"; then
  pass "custom role name used"
else
  fail "custom role name used"
fi
# --- full run: immutable subject claim repo form ---
reset_fake_aws 1 1
expect_ok "run with immutable subject claim repo exits 0" \
  run_setup --repo 'octo@123456/demo@789012'
if log_has "repo:octo@123456/demo@789012:ref:refs/heads/*"; then
  pass "immutable repo prefix in branch statement"
else
  fail "immutable repo prefix in branch statement"
fi

# --- full run: idempotent re-run ---
reset_fake_aws 1 1
run_setup >/dev/null 2>&1
run_setup >/dev/null 2>&1
update_count="$(grep -c "iam update-assume-role-policy" "${aws_log}")"
if [[ "${update_count}" -eq 2 ]]; then
  pass "re-running is idempotent (update-assume-role-policy twice)"
else
  fail "re-running is idempotent (update-assume-role-policy twice) (got ${update_count})"
fi

# --- negative: invalid arguments ---
expect_fail "invalid account id rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id notdigits
expect_fail "account id with wrong length rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 12345
expect_fail "repo without owner rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --repo "noslash"
expect_fail "repo with path separators rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --repo "a/b/c"
expect_fail "repo with non-numeric immutable id rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --repo "octo@abc/demo"
expect_fail "repo with id but no owner name rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --repo "@123456/demo"
expect_fail "one-character production slug rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --prod-environment p
expect_fail "production slug with invalid CDK characters rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --prod-environment 'Prod Env'
expect_fail "production branch with invalid characters rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --prod-branch 'release branch'
expect_fail "role name with invalid characters rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id 123456789012 --role-name "bad name"
expect_fail "unknown flag rejected" "${SETUP_SCRIPT}" --bogus
expect_fail "flag without value rejected" \
  "${SETUP_SCRIPT}" --dry-run --account-id
expect_fail "dry-run without --account-id rejected" "${SETUP_SCRIPT}" --dry-run

# --- negative: missing aws CLI ---
empty_bin="${test_dir}/empty-bin"
mkdir -p "${empty_bin}"
expect_fail "missing aws CLI rejected" \
  env PATH="${empty_bin}:/usr/bin:/bin" "${SETUP_SCRIPT}"

echo ""
echo "Results: ${pass_count} passed, ${fail_count} failed"
if [[ ${fail_count} -gt 0 ]]; then
  exit 1
fi
