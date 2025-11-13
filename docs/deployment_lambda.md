# Deployment on AWS Lambda

## Introduction

AWS Lambda provides a serverless deployment option for Code Metrics, offering automatic scaling, pay-per-use pricing, and reduced operational overhead. This approach is ideal for organisations already invested in the AWS ecosystem or those seeking a managed infrastructure solution.

### When to choose Lambda

**Best suited for:**

- **Variable workloads**: Teams with fluctuating usage patterns benefit from Lambda's automatic scaling and pay-per-request pricing
- **AWS-native environments**: Organisations already using AWS services (S3, CloudFront, API Gateway) can leverage existing infrastructure and expertise
- **Reduced operations**: No server management required—AWS handles patching, scaling, and availability
- **Cost optimisation**: Pay only for actual compute time, making it economical for low-to-moderate usage

**Consider alternatives if:**

- **High sustained traffic**: Continuously high request volumes may be more cost-effective on dedicated infrastructure (Docker, Kubernetes)
- **Cold start sensitivity**: Lambda functions experience initialization delays (cold starts) which may impact response times for infrequent requests
- **Complex configuration**: Requires managing multiple AWS services (Lambda, S3, CloudFront, API Gateway) and understanding AWS-specific concepts
- **Vendor lock-in concerns**: Tight coupling to AWS services may complicate migration to other platforms

### Architecture overview

The Lambda deployment consists of:

- **Backend API**: Node.js 20.x Lambda function handling all API requests
- **Frontend UI**: Static assets hosted on S3 and distributed via CloudFront
- **Database**: MongoDB connection (external or MongoDB Atlas)
- **Infrastructure**: SAM (Serverless Application Model) templates for provisioning

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) configured with appropriate credentials
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for infrastructure deployment
- Node.js 20.x or later for runtime environment
- An AWS account with permissions to create Lambda functions, S3 buckets, CloudFront distributions, and API Gateway resources
- A DynamoDB database (or, optionally, MongoDB such as AWS DocumentDB or MongoDB Atlas)

## Deployment

The AWS Lambda deployment can be found on the [Releases page](https://github.com/code-metrics-project/releases/releases).

Download the `codemetrics-api.zip` file. See the example [template.yaml](../backend/lambda/template.yaml) for an example of how to deploy the Lambda function.

The frontend web UI is a static site, so can be hosted anywhere. You can find the latest version of the web UI on the [Releases page](https://github.com/code-metrics-project/releases/releases).

Download the `codemetrics-ui.zip` file and host it on a static site. You will need to set the `apiBaseUrl` variable in `config.json` to point to the API endpoint.

### Example

#### Infrastructure and backend

Change directory to the `codemetrics-api` directory:

```bash
cd backend/lambda
```

Deploy bucket and CloudFront distribution:

```bash
sam deploy
```

#### Frontend

Set `apiBaseUrl` in `config.json` to the API base URL.

Deploy static web assets:

```bash
aws s3 sync dist/ s3://<bucket-name>/
```

#### Configuration

After deployment, configure the following:

1. **Environment variables**: Set Lambda environment variables for database connection, authentication, and feature flags. See the [environment variables documentation](./env_vars.md) for details.
2. **API Gateway**: Configure CORS settings, custom domains, and throttling limits as needed.
3. **CloudFront**: Update cache behaviours and TTL settings for optimal performance.
4. **Lambda function**: Adjust memory allocation (recommended: 1024MB-2048MB) and timeout (recommended: 30s) based on your workload.

For teams with moderate usage (e.g., 100K requests/month), Lambda typically costs $5-20/month. High-traffic deployments should evaluate total cost against container-based alternatives.

---

## Running periodic cache updates on AWS Lambda

You can run periodic cache updates on AWS Lambda. See [Trigger a cache refresh](./system_admin.md) for more information.

---

## Summary

AWS Lambda deployment offers a serverless, scalable solution for Code Metrics with minimal operational overhead. While it introduces AWS-specific complexity and potential cold start latency, it provides excellent cost efficiency for variable workloads and integrates seamlessly with AWS services. This deployment method is particularly well-suited for teams with existing AWS infrastructure or those seeking to minimize server management responsibilities.

### Next steps

- Configure [environment variables](./env_vars.md) for your deployment
- Set up [authentication](./authentication.md) for secure access
- Configure [integrations](./configuration.md) with your development tools
- Set up [periodic cache updates](./system_admin.md) for optimal performance

---

## Troubleshooting

### Debugging Lambda functions

**Enable detailed logging:**

```bash
# Set environment variables in Lambda configuration
LOG_LEVEL=2
NODE_OPTIONS=--enable-source-maps
```

- `LOG_LEVEL=2` provides verbose logging for debugging
- `NODE_OPTIONS=--enable-source-maps` enables proper stack traces with line numbers

**View logs in CloudWatch:**

```bash
# Stream logs in real-time
sam logs -n CodeMetricsFunction --stack-name <stack-name> --tail
```

Or view in AWS Console by navigating to CloudWatch > Log Groups > `/aws/lambda/<function-name>`.

### Common issues

#### Cold start latency

**Symptom**: First request after idle period is slow (2-5 seconds)

**Solutions**:

- Enable [Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) to keep instances warm
- Use CloudWatch Events to invoke the function every 5 minutes
- Consider container-based deployment for consistent performance

#### Function timeout errors

**Symptom**: Requests fail with "Task timed out after X seconds"

**Solutions**:

- Increase Lambda timeout
- Review `LOG_LEVEL=2` output to identify slow operations

#### Memory errors

**Symptom**: Function fails with "JavaScript heap out of memory"

**Solutions**:

- Monitor CloudWatch metrics for actual memory usage
- Increase Lambda memory allocation (test with 2048MB or higher)

#### CORS errors in browser

**Symptom**: Frontend cannot access API, browser console shows CORS errors

**Solutions**:

- Verify CORS configuration includes correct origins
- If using CloudFront, ensure it is forwarding `Origin` headers
- Test API directly with curl to isolate frontend vs. backend issues

#### CloudFront cache issues

**Symptom**: Frontend shows old version after deployment

**Solutions**:

- Shorten CloudFront cache period
- Invalidate CloudFront cache

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

- Ensure role has necessary permissions (DynamoDB read/write, CloudWatch Logs etc.)
- Use AWS IAM Policy Simulator to test permissions

### Performance optimisation

**Monitor key metrics:**

- Lambda duration (target: <1000ms for typical requests)
- Memory utilisation (provision 20-30% headroom)
- Cold start frequency
- Database connection time

**Optimisation techniques:**

- Minimise Lambda package size by excluding dev dependencies
- Use Lambda Layers for shared dependencies
- Implement caching for frequently accessed data
- Optimise database indexes for common queries
- Consider connection pooling with MongoDB

### Getting help

If issues persist:

1. Check CloudWatch Logs for detailed error messages
2. Enable X-Ray tracing for distributed tracing insights
3. Review the [configuration documentation](./configuration.md)
4. Consult the [Code Metrics community](https://github.com/code-metrics-project) for support
