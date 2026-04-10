#!/bin/bash

# Local AWS bootstrap script for DynamoDB.
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

echo "Creating DynamoDB tables at ${AWS_ENDPOINT_URL}..."

# Function to create a table with standard schema
create_table() {
    local TABLE_NAME=$1
    local TTL_ATTRIBUTE=${2:-""}
    
    echo "Creating table: CodeMetrics_${TABLE_NAME}"
    
    aws_local dynamodb create-table \
        --table-name "CodeMetrics_${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=pk,AttributeType=S \
            AttributeName=sk,AttributeType=S \
        --key-schema \
            AttributeName=pk,KeyType=HASH \
            AttributeName=sk,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        2>/dev/null || echo "Table CodeMetrics_${TABLE_NAME} may already exist"
    
    # Enable TTL if specified
    if [ -n "$TTL_ATTRIBUTE" ]; then
        aws_local dynamodb update-time-to-live \
            --table-name "CodeMetrics_${TABLE_NAME}" \
            --time-to-live-specification "Enabled=true,AttributeName=${TTL_ATTRIBUTE}" \
            2>/dev/null || true
    fi
}

# Create all required tables
# These match the tables created by the DynamoDB datastore implementation

create_table "github-issues" "ttl"
create_table "github-workflow-runs" "ttl"
create_table "vcs-cache" "ttl"
create_table "repo-commits" "ttl"
create_table "commit-prs" "ttl"
create_table "pipeline-executions" "ttl"
create_table "vulns" "ttl"
create_table "alerts" "ttl"
create_table "queries"
create_table "token_ids"
create_table "deploy-bounds"
create_table "earliest-commits"
create_table "fetch-merge-rules" "ttl"
create_table "fetch-file" "ttl"

echo ""
echo "DynamoDB tables created successfully!"
echo ""
echo "Available tables:"
aws_local dynamodb list-tables --query 'TableNames' --output table
