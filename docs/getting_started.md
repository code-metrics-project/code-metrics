# Getting started

CodeMetrics brings together engineering data from your source control, CI/CD pipelines, code quality tools, and issue trackers into a single view. This guide walks you through getting it running and connected to your tooling.

---

## Before you begin

You will need access to the external systems you want to integrate. CodeMetrics pulls data from:

- **Source control** — GitHub, Bitbucket Server, or Azure DevOps
- **CI/CD pipelines** — GitHub Actions, Azure Pipelines, Jenkins, or Dynatrace
- **Code quality** — SonarQube or SonarCloud
- **Issue tracking** — Jira, Azure DevOps, or ServiceNow

See [feature support](./features.md) for the full compatibility matrix.

> **Don't have access to these systems yet?** CodeMetrics ships with mock implementations of all supported integrations, so you can run a fully functional demo without connecting to real tools. See the [mocks documentation](../mocks/README.md) for setup instructions.

You will also need a **license file** (`license.yaml`) containing your email and license key.

---

## Step 1: Choose a deployment method

| Method                                   | Best for                                         |
| ---------------------------------------- | ------------------------------------------------ |
| [Docker Compose](./deployment_docker.md) | Local evaluation, development, self-hosted teams |
| [AWS Lambda](./deployment_lambda.md)     | Serverless production deployments on AWS         |
| [Kubernetes / Helm](./helm.md)           | Container-based production deployments           |
| [Node.js directly](./run_local_node.md)  | Development or minimal environments              |
| [Desktop app](./desktop.md)              | Individual use without a server                  |

For a first-time setup, **Docker Compose is the fastest path** to a running instance.

---

## Step 2: Create your configuration files

CodeMetrics reads from three configuration files. Start by copying the examples:

```
examples/remote-config.yaml   →  remote-config.yaml
examples/workload-config.yaml →  workload-config.yaml
<your license>                →  license.yaml
```

### remote-config.yaml — connect your tools

This file tells CodeMetrics how to authenticate and query your external systems. It has sections for each integration type:

- [Code management](./config_code_management.md) (GitHub, Bitbucket, Azure DevOps)
- [CI/CD pipelines](./config_pipelines.md) (GitHub Actions, Jenkins, Azure Pipelines, Dynatrace)
- [Code quality](./config_code_quality.md) (SonarQube, SonarCloud)
- [Project management](./config_project_management.md) (Jira, Azure DevOps)
- [Incidents](./config_incidents.md) (Jira, ServiceNow)

Only configure the sections relevant to your tooling. Sections for unused integrations can be left empty or omitted.

### workload-config.yaml — model your teams

A **workload** is a named grouping of repositories — typically a team, service area, or product. Workloads are the primary unit of organisation in CodeMetrics.

Within a workload you can define **repository groups** to further segment repositories (e.g. by layer: `frontend`, `backend`, `platform`).

➡️ [Learn about configuring workloads](./config_workloads.md)

### license.yaml

```yaml
email: you@example.com
key: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Place all three files in the same directory and point CodeMetrics at it using the `CONFIG_DIR` environment variable.

---

## Step 3: Configure authentication

CodeMetrics requires user authentication. The default is **file-based authentication**, which stores usernames and password hashes in a `users.json` file — suitable for getting started quickly.

For production, integrate with your identity provider:

| Provider                | Details                                                 |
| ----------------------- | ------------------------------------------------------- |
| File-based (default)    | [Authentication guide](./authentication_file.md)        |
| Azure Entra ID          | [Azure authentication](./authentication_azure.md)       |
| AWS Cognito             | [Cognito authentication](./authentication_cognito.md)   |
| Keycloak                | [Keycloak authentication](./authentication_keycloak.md) |
| LDAP / Active Directory | [LDAP authentication](./authentication_ldap.md)         |
| OpenID Connect          | [OIDC authentication](./authentication_oidc.md)         |

Set `AUTHENTICATOR_IMPL` to the provider you want to use, and set `ACCESS_TOKEN_SECRET` to a strong random string shared across all backend instances.

---

## Step 4: Choose a datastore

The default datastore is **in-memory**, which requires no configuration but does not persist data between restarts. For any persistent or shared deployment, choose a durable datastore:

| Datastore         | Suitable for                                        |
| ----------------- | --------------------------------------------------- |
| `inmem` (default) | Local development, quick evaluation                 |
| `localdb`         | Single-instance persistent deployments              |
| `dynamodb`        | AWS-hosted production deployments                   |
| `mongodb`         | Self-hosted or MongoDB Atlas production deployments |

Set `DATASTORE_IMPL` to your chosen implementation. See [Datastores](./datastores.md) for full configuration details.

---

## Step 5: Start the application

Follow the deployment-specific instructions for your chosen method, then open the UI in your browser. Log in with your configured credentials to run your first query.

---

## Next steps

Once you have a running instance:

- **Explore queries** — run [built-in queries](./queries.md) for DORA metrics, pipeline health, code coverage trends, and more
- **Refine workloads** — add repository groups and tags to slice metrics by team or layer ([workload configuration](./config_workloads.md))
- **Set up quality gates** — define thresholds and track compliance across repositories ([quality gates](./quality_gates_admin.md))
- **Secure your API** — issue service tokens for CI/CD or tooling integrations ([API authentication](./integration_api_authentication.md))
- **Review all environment variables** — fine-tune caching, TTLs, and other runtime behaviour ([environment variables](./env_vars.md))
