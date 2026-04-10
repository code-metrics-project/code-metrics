#!/bin/bash
# Deploy CodeMetrics Lambda to the local AWS emulator for testing
#
# This script is self-contained - it sets up all required AWS environment
# variables for the local AWS emulator automatically. No prior setup needed.
#
# Prerequisites:
# - MiniStack or compatible local AWS emulator running with Lambda service enabled
# - AWS CLI installed
# - Backend built (will build automatically if needed)
#
# Usage:
#   ./scripts/deploy-lambda-aws-local.sh [OPTIONS]
#
# Options:
#   -t, --run-tests    Run MiniStack deployed-Lambda tests after deployment
#   -h, --help         Show this help message
#
# Optional environment variable overrides:
#   AWS_ENDPOINT_URL - MiniStack endpoint (default: http://localhost:4566)
#   AWS_REGION - AWS region (default: us-east-1)
#   LAMBDA_FUNCTION_NAME - Function name (default: codemetrics-api)

set -e

# =============================================================================
# Environment Setup (self-contained - no prior setup required)
# =============================================================================

# Local emulator credentials (these are dummy values accepted by MiniStack)
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"

# Configuration with sensible defaults
AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-east-1}"
LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-codemetrics-api}"

# Resolve paths relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_ROOT}/backend"
LAMBDA_DIR="${BACKEND_DIR}/lambda"
DIST_DIR="${BACKEND_DIR}/dist"
COMPOSE_DIR="${PROJECT_ROOT}/compose"

# Config sources within the project
EXAMPLES_CONFIG_DIR="${BACKEND_DIR}/config/examples"
TEST_LICENSE_FILE="${BACKEND_DIR}/src/license/__tests__/test-data/valid/license.yaml"

# Script options (set via command line flags)
RUN_TESTS=false

# =============================================================================
# Argument Parsing
# =============================================================================

show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Deploy CodeMetrics Lambda to MiniStack for testing."
  echo ""
  echo "Options:"
  echo "  -t, --run-tests    Run MiniStack deployed-Lambda tests after deployment"
  echo "  -h, --help         Show this help message"
  echo ""
  echo "Environment Variables:"
  echo "  AWS_ENDPOINT_URL       MiniStack endpoint (default: http://localhost:4566)"
  echo "  AWS_REGION             AWS region (default: us-east-1)"
  echo "  LAMBDA_FUNCTION_NAME   Function name (default: codemetrics-api)"
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      -t|--run-tests)
        RUN_TESTS=true
        shift
        ;;
      -h|--help)
        show_help
        ;;
      *)
        echo "Unknown option: $1"
        echo "Use -h or --help for usage information."
        exit 1
        ;;
    esac
  done
}

# =============================================================================
# Logging Helpers
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# AWS CLI wrapper for the local AWS emulator
aws_local() {
  aws --endpoint-url="$AWS_ENDPOINT_URL" --region="$AWS_REGION" "$@"
}

upsert_local_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if aws_local secretsmanager update-secret --secret-id "$secret_name" --secret-string "$secret_value" > /dev/null 2>&1; then
    return
  fi

  if aws_local secretsmanager create-secret --name "$secret_name" --secret-string "$secret_value" > /dev/null 2>&1; then
    return
  fi

  aws_local secretsmanager update-secret --secret-id "$secret_name" --secret-string "$secret_value" > /dev/null
}

# =============================================================================
# Prerequisites Check
# =============================================================================

check_prerequisites() {
  log_step "Checking prerequisites..."
  
  # Check AWS CLI
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install it first:"
    echo "  brew install awscli  # macOS"
    echo "  apt install awscli   # Linux"
    exit 1
  fi
  
  # Check if the local AWS emulator is running
  if ! curl -sf "${AWS_ENDPOINT_URL}/_ministack/health" > /dev/null 2>&1; then
    log_warn "Local AWS emulator not available at ${AWS_ENDPOINT_URL}"
    log_info "Starting local AWS emulator..."
    
    if [ -f "${COMPOSE_DIR}/docker-compose-aws-local.yaml" ]; then
      docker-compose -f "${COMPOSE_DIR}/docker-compose-aws-local.yaml" up -d
      
      log_info "Waiting for local AWS emulator to be ready..."
      WAIT_SECONDS=0
      MAX_WAIT=60
      until curl -sf "${AWS_ENDPOINT_URL}/_ministack/health" > /dev/null 2>&1; do
        sleep 2
        WAIT_SECONDS=$((WAIT_SECONDS + 2))
        if [ $WAIT_SECONDS -ge $MAX_WAIT ]; then
          log_error "Local AWS emulator failed to start within ${MAX_WAIT} seconds"
          exit 1
        fi
      done
      log_info "Local AWS emulator is ready!"
    else
      log_error "Local AWS compose file not found at ${COMPOSE_DIR}/docker-compose-aws-local.yaml"
      log_error "Please start MiniStack manually or ensure the compose file exists."
      exit 1
    fi
  fi
  
  if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    log_warn "Backend dependencies not installed. Installing now..."
    cd "$BACKEND_DIR"
    npm ci --prefer-offline 2>/dev/null || npm install
    cd "$SCRIPT_DIR"
  fi

  log_info "Building backend release artifact..."
  cd "$BACKEND_DIR"
  npm run release
  cd "$SCRIPT_DIR"
  
  log_info "Prerequisites check passed!"
}

create_local_aws_secrets() {
  log_step "Seeding local Secrets Manager..."

  local github_app_id="123456"
  local github_installation_id="12345678"
  local anthropic_api_key="test-anthropic-key"
  local google_ai_api_key="test-google-key"
  local github_private_key

  if ! command -v openssl > /dev/null 2>&1; then
    log_error "openssl is required to generate test GitHub App private key for local Secrets Manager"
    exit 1
  fi
  github_private_key="$(openssl genrsa 2048 2>/dev/null)"

  upsert_local_secret "GITHUB_APP_ID" "$github_app_id"
  upsert_local_secret "GITHUB_APP_INSTALLATION_ID" "$github_installation_id"
  upsert_local_secret "GITHUB_APP_PRIVATE_KEY" "$github_private_key"
  upsert_local_secret "ANTHROPIC_API_KEY" "$anthropic_api_key"
  upsert_local_secret "GOOGLE_AI_API_KEY" "$google_ai_api_key"

  log_info "Local emulator secrets ready"
}

# =============================================================================
# Lambda Package Creation
# =============================================================================

create_lambda_package() {
  log_step "Creating Lambda deployment package..."
  
  PACKAGE_DIR=$(mktemp -d)
  ZIP_FILE="${LAMBDA_DIR}/function.zip"
  
  # The dist directory contains the bundled application (esbuild output)
  if [ ! -f "$DIST_DIR/index.js" ]; then
    log_error "Bundled index.js not found in dist. Run 'npm run release' in backend/ first."
    exit 1
  fi
  
  # Copy the bundled JavaScript file
  cp "$DIST_DIR/index.js" "$PACKAGE_DIR/"
  cp "$DIST_DIR/index.js.map" "$PACKAGE_DIR/" 2>/dev/null || true
  
  # Copy OpenAPI specs if they exist
  if [ -d "$DIST_DIR/openapi" ]; then
    cp -r "$DIST_DIR/openapi" "$PACKAGE_DIR/"
  fi
  
  # Copy config files from examples
  mkdir -p "$PACKAGE_DIR/config"
  cp -r "$EXAMPLES_CONFIG_DIR"/* "$PACKAGE_DIR/config/" 2>/dev/null || true
  
  # Copy the test license (valid dev license for local emulator testing)
  if [ -f "$TEST_LICENSE_FILE" ]; then
    cp "$TEST_LICENSE_FILE" "$PACKAGE_DIR/config/license.yaml"
    log_info "Added test license to package"
  else
    log_warn "Test license not found at $TEST_LICENSE_FILE - Lambda may not be fully functional"
  fi
  
  # Remove file-based secrets to enforce Secrets Manager usage in the local emulator
  rm -f "$PACKAGE_DIR/config/secrets.yaml" "$PACKAGE_DIR/config/secrets.yaml.example"
  
  # Copy public keys for license validation
  if [ -d "$BACKEND_DIR/public-keys" ]; then
    mkdir -p "$PACKAGE_DIR/public-keys"
    cp -r "$BACKEND_DIR/public-keys"/* "$PACKAGE_DIR/public-keys/" 2>/dev/null || true
  fi
  
  # Create .env for Lambda
  cat > "$PACKAGE_DIR/.env" << EOF
NODE_ENV=production
CONFIG_DIR=./config
DATASTORE_IMPL=dynamodb
DATABASE_NAME=codemetrics
AWS_REGION=${AWS_REGION}
AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL}
SECRET_RESOLVER_IMPL=secretsmanager
AUTHENTICATOR_IMPL=file
ACCESS_TOKEN_SECRET=test-secret-for-aws-local
STRICT_CONFIG_LOAD=false
EOF
  
  # Create ZIP from the package directory
  mkdir -p "$LAMBDA_DIR"
  cd "$PACKAGE_DIR"
  zip -rq "$ZIP_FILE" . -x "*.git*"
  
  # Cleanup
  cd "$SCRIPT_DIR"
  rm -rf "$PACKAGE_DIR"
  
  ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
  ZIP_BYTES=$(stat -f%z "$ZIP_FILE" 2>/dev/null || stat -c%s "$ZIP_FILE")
  
  log_info "Lambda package created: $ZIP_FILE ($ZIP_SIZE)"
  
  # Check if package exceeds direct upload limit (50MB)
  if [ "$ZIP_BYTES" -gt 52428800 ]; then
    log_warn "Package exceeds 50MB limit - will use S3 for deployment"
    USE_S3_DEPLOY="true"
  else
    USE_S3_DEPLOY="false"
    log_info "Package size OK for direct upload"
  fi
}

# =============================================================================
# AWS Resource Creation
# =============================================================================

create_lambda_role() {
  log_step "Creating Lambda execution role..."
  
  ROLE_NAME="lambda-execution-role"
  
  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
  
  if aws_local iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    log_info "Role '$ROLE_NAME' already exists"
    return
  fi

  if ! aws_local iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    > /dev/null 2>&1; then
    if aws_local iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
      log_info "Role '$ROLE_NAME' already exists"
      return
    fi

    log_error "Failed to create Lambda role '$ROLE_NAME'"
    exit 1
  fi
  
  aws_local iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
    2>/dev/null || true
  
  log_info "Lambda role created: $ROLE_NAME"
}

create_dynamodb_table() {
  log_step "Creating DynamoDB table..."
  
  TABLE_NAME="codemetrics"
  
  if aws_local dynamodb describe-table --table-name "$TABLE_NAME" > /dev/null 2>&1; then
    log_info "Table '$TABLE_NAME' already exists"
    return
  fi
  
  aws_local dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    > /dev/null
  
  log_info "DynamoDB table created: $TABLE_NAME"
}

create_s3_bucket() {
  log_info "Creating S3 bucket for Lambda code..."
  
  BUCKET_NAME="lambda-code-bucket"
  
  if aws_local s3api head-bucket --bucket "$BUCKET_NAME" > /dev/null 2>&1; then
    log_info "Bucket '$BUCKET_NAME' already exists"
    return
  fi
  
  aws_local s3 mb "s3://$BUCKET_NAME" > /dev/null
  log_info "S3 bucket created: $BUCKET_NAME"
}

upload_to_s3() {
  log_info "Uploading Lambda package to S3..."
  
  ZIP_FILE="${LAMBDA_DIR}/function.zip"
  S3_KEY="lambda/${LAMBDA_FUNCTION_NAME}/function.zip"
  
  aws_local s3 cp "$ZIP_FILE" "s3://lambda-code-bucket/$S3_KEY" > /dev/null
  log_info "Package uploaded to s3://lambda-code-bucket/$S3_KEY"
}

# =============================================================================
# Lambda Deployment
# =============================================================================

deploy_lambda() {
  log_step "Deploying Lambda function: $LAMBDA_FUNCTION_NAME"
  
  ZIP_FILE="${LAMBDA_DIR}/function.zip"
  ROLE_ARN="arn:aws:iam::000000000000:role/lambda-execution-role"
  ENVIRONMENT_VARS="Variables={NODE_ENV=production,AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL},AWS_REGION=${AWS_REGION},DATASTORE_IMPL=dynamodb,DATABASE_NAME=codemetrics,SECRET_RESOLVER_IMPL=secretsmanager,AUTHENTICATOR_IMPL=file,ACCESS_TOKEN_SECRET=test-secret-for-aws-local,STRICT_CONFIG_LOAD=false,INVOCATION_MODE=serve-api}"
  
  # For large packages, use S3
  if [ "$USE_S3_DEPLOY" = "true" ]; then
    create_s3_bucket
    upload_to_s3
    S3_BUCKET="lambda-code-bucket"
    S3_KEY="lambda/${LAMBDA_FUNCTION_NAME}/function.zip"
  fi
  
  # Check if function exists
  if aws_local lambda get-function --function-name "$LAMBDA_FUNCTION_NAME" > /dev/null 2>&1; then
    log_info "Updating existing function..."
    if [ "$USE_S3_DEPLOY" = "true" ]; then
      aws_local lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --s3-bucket "$S3_BUCKET" \
        --s3-key "$S3_KEY" \
        > /dev/null
    else
      aws_local lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --zip-file "fileb://$ZIP_FILE" \
        > /dev/null
    fi
  else
    log_info "Creating new function..."
    if [ "$USE_S3_DEPLOY" = "true" ]; then
      aws_local lambda create-function \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --runtime nodejs20.x \
        --handler index.handler \
        --role "$ROLE_ARN" \
        --code "S3Bucket=$S3_BUCKET,S3Key=$S3_KEY" \
        --timeout 30 \
        --memory-size 512 \
        --environment "$ENVIRONMENT_VARS" \
        > /dev/null
    else
      aws_local lambda create-function \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --runtime nodejs20.x \
        --handler index.handler \
        --role "$ROLE_ARN" \
        --zip-file "fileb://$ZIP_FILE" \
        --timeout 30 \
        --memory-size 512 \
        --environment "$ENVIRONMENT_VARS" \
        > /dev/null
    fi
  fi

  aws_local lambda update-function-configuration \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --environment "$ENVIRONMENT_VARS" \
    > /dev/null
  
  log_info "Waiting for function to be active..."
  aws_local lambda wait function-active-v2 --function-name "$LAMBDA_FUNCTION_NAME" 2>/dev/null || sleep 5
  
  log_info "Lambda function deployed successfully!"
}

create_function_url() {
  log_step "Creating Function URL..."
  
  if aws_local lambda get-function-url-config --function-name "$LAMBDA_FUNCTION_NAME" > /dev/null 2>&1; then
    FUNCTION_URL=$(aws_local lambda get-function-url-config --function-name "$LAMBDA_FUNCTION_NAME" --query 'FunctionUrl' --output text)
  else
    FUNCTION_URL=$(aws_local lambda create-function-url-config \
      --function-name "$LAMBDA_FUNCTION_NAME" \
      --auth-type NONE \
      --query 'FunctionUrl' \
      --output text)
  fi
  
  log_info "Function URL: $FUNCTION_URL"
  echo "$FUNCTION_URL" > "${LAMBDA_DIR}/function-url.txt"
}

# =============================================================================
# Testing
# =============================================================================

test_lambda() {
  log_step "Testing Lambda invocation..."
  
  TEST_EVENT_FILE=$(mktemp)
  cat > "$TEST_EVENT_FILE" << 'EVENTEOF'
{
  "version": "2.0",
  "rawPath": "/api/health/liveness",
  "rawQueryString": "",
  "headers": {"content-type": "application/json", "host": "lambda.test"},
  "requestContext": {"http": {"method": "GET", "path": "/api/health/liveness"}, "requestId": "test-123"},
  "isBase64Encoded": false
}
EVENTEOF
  
  RESPONSE=$(aws_local lambda invoke \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --cli-binary-format raw-in-base64-out \
    --payload "file://$TEST_EVENT_FILE" \
    /tmp/lambda-response.json \
    --query 'StatusCode' \
    --output text 2>/dev/null) || true
  
  rm -f "$TEST_EVENT_FILE"
  
  if [ "$RESPONSE" = "200" ]; then
    log_info "Lambda invocation successful!"
    RESPONSE_BODY=$(cat /tmp/lambda-response.json)
    if echo "$RESPONSE_BODY" | grep -q "statusCode"; then
      STATUS_CODE=$(echo "$RESPONSE_BODY" | grep -o '"statusCode":[0-9]*' | grep -o '[0-9]*')
      log_info "API Response Status: $STATUS_CODE"
    else
      log_info "Response: $RESPONSE_BODY"
    fi
  else
    log_warn "Lambda invocation returned status: $RESPONSE (may still be initializing)"
    log_info "Response: $(cat /tmp/lambda-response.json 2>/dev/null || echo 'No response')"
  fi
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
  echo ""
  echo "========================================"
  echo "  MiniStack Lambda Deployment Complete"
  echo "========================================"
  echo ""
  echo "Function Name: $LAMBDA_FUNCTION_NAME"
  echo "Endpoint:      $AWS_ENDPOINT_URL"
  echo "Region:        $AWS_REGION"
  echo ""
  echo "To invoke the Lambda manually:"
  echo "  aws --endpoint-url=$AWS_ENDPOINT_URL \\"
  echo "      --region=$AWS_REGION \\"
  echo "      lambda invoke \\"
  echo "      --function-name $LAMBDA_FUNCTION_NAME \\"
  echo "      --cli-binary-format raw-in-base64-out \\"
  echo "      --payload file://backend/lambda/events/event.json \\"
  echo "      response.json"
  echo ""
  echo "To run the deployed Lambda tests:"
  echo "  cd backend && LAMBDA_DEPLOYED=true npm run test:e2e:aws-local-deploy"
  echo ""
  echo "To view emulator logs:"
  echo "  docker logs compose-aws-local-1 | grep lambda"
  echo ""
}

# =============================================================================
# Run Integration Tests
# =============================================================================

run_integration_tests() {
  log_step "Running deployed-Lambda tests..."
  echo ""
  
  cd "$BACKEND_DIR"
  
  # Export environment variables for the tests
  export LAMBDA_DEPLOYED=true
  export AWS_ENDPOINT_URL
  export AWS_REGION
  export AWS_ACCESS_KEY_ID
  export AWS_SECRET_ACCESS_KEY
  
  # Run the tests
  npm run test:e2e:aws-local-deploy
  
  TEST_EXIT_CODE=$?
  cd "$SCRIPT_DIR"
  
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_info "All deployed-Lambda tests passed!"
  else
    log_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
    exit $TEST_EXIT_CODE
  fi
}

# =============================================================================
# Main
# =============================================================================

main() {
  # Parse command line arguments
  parse_args "$@"
  
  echo ""
  log_info "CodeMetrics MiniStack Lambda Deployment"
  log_info "========================================="
  echo ""
  
  check_prerequisites
  create_local_aws_secrets
  create_lambda_package
  create_lambda_role
  create_dynamodb_table
  deploy_lambda
  create_function_url
  test_lambda
  print_summary
  
  # Optionally run integration tests
  if [ "$RUN_TESTS" = true ]; then
    run_integration_tests
  fi
}

main "$@"
