# Deployment on AWS Lambda

## Introduction

This document describes how to deploy Code Metrics on AWS Lambda.

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- Node.js 20.x or later

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

---

## Running periodic cache updates on AWS Lambda

You can run periodic cache updates on AWS Lambda. See [Trigger a cache refresh](./system_admin.md) for more information.

---

## Troubleshooting

To troubleshoot issues with the AWS Lambda deployment, try the following:

- Set the `LOG_LEVEL` to `2` environment variable to get more detailed logs.
- Set the `NODE_OPTIONS=--enable-source-maps` environment variable to enable source maps, which will provide a proper stack trace.
