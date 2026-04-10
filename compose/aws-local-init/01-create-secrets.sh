#!/bin/bash

# Local AWS bootstrap script for Secrets Manager.
# Compatible with MiniStack via standard AWS CLI endpoint overrides.

set -euo pipefail

AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://aws-local:4566}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"

export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION="$AWS_REGION"

aws_local() {
    aws --endpoint-url "$AWS_ENDPOINT_URL" --region "$AWS_REGION" "$@"
}

upsert_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    if aws_local secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
        aws_local secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            >/dev/null
    else
        aws_local secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            >/dev/null
    fi
}

echo "Creating secrets in local AWS Secrets Manager at ${AWS_ENDPOINT_URL}..."

# GitHub App credentials (example values for local testing)
# Replace these with your actual credentials
upsert_secret "GITHUB_APP_ID" "123456" "GitHub App ID for code-metrics"

upsert_secret "GITHUB_APP_INSTALLATION_ID" "78901234" "GitHub App Installation ID"

upsert_secret "GITHUB_APP_PRIVATE_KEY" "-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAyourprivatekeycontenthere1234567890abcdefghijklmno
pqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789yourprivatekeyhere
examplekeycontentnotarealkeyforlocaltestingonlyreplacewithrealinprod
... (truncated for brevity - replace with your actual private key) ...
-----END RSA PRIVATE KEY-----" \
    "GitHub App Private Key"

echo "Secrets created successfully!"

# List all secrets to verify
echo "Available secrets:"
aws_local secretsmanager list-secrets --query 'SecretList[*].Name' --output table
