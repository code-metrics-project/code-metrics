# Remote Configuration: Code Management

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

Code Metrics integrates with version control systems to retrieve repository information, commit history, and code changes. This data is used to analyze code quality metrics, calculate velocity, and track development trends. Currently, Code Metrics supports Azure DevOps and GitHub as code management providers.

## Azure DevOps (ADO)

### Access

Azure DevOps authentication requires a Personal Access Token (PAT) with appropriate scopes for repository access.

> **Note**
> The same token value may also be used for retrieving Work Items within the [project management](./config_project_management.md) configuration if required and permission is provided within the token scope.

#### Creating an Azure Personal Access Token

1. Sign in to your Azure DevOps organization at `https://dev.azure.com/{your-organization}`.
2. Navigate to **User Settings** (top right corner) and select **Personal access tokens**.
3. Click **+ New Token** to create a new PAT.
4. Configure the token with the following settings:
   - **Name**: Enter a descriptive name (e.g., "Code Metrics Integration")
   - **Organization**: Select your organization
   - **Expiration**: Set an appropriate expiration date (recommended: 1 year)
5. Under **Scopes**, select **Custom defined** and grant the following permissions:
   - **Code (Read)**: Required to read repository information and commit history
   - **Code (Status)**: Required to read build status and pull request status
6. Click **Create** and copy the generated token immediately (it won't be shown again).

For detailed instructions, see the [Azure DevOps PAT documentation](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).

### Configuration

Configure the `codeManagement.azure` server object in the `remote-config.yaml` file:

```yaml
# remote-config.yaml
---
codeManagement:
  azure:
    servers:
      - id: example-azure
        url: https://dev.azure.com/my-organization
        apiKey: "${secret.AZURE_DEVOPS_PAT}"
        authMethod: BEARER_TOKEN
```

> **Note**
> Store the token securely using the [secrets management](./secret_management.md) mechanism rather than storing it directly in the configuration file.

### Workload Configuration

In your `workload-config.yaml` file, reference the Azure DevOps server:

```yaml
# workload-config.yaml
---
workloads:
  - id: my-workload
    # ... other workload config
    codeManagement:
      type: azure
      serverId: example-azure
      projectName: my-project
      repoGroups:
        backend:
          components:
            - repo: my-repository
            - repo: another-repository
```

The `projectName` parameter is required and should match the Azure DevOps project containing your repositories.

The repository group name, such as `backend` in the example above, is an arbitrary name you assign to group related repositories together. See the [workload configuration documentation](./config_workloads.md) for more details.

## GitHub

### Access

GitHub authentication requires a Personal Access Token (PAT) with specific scopes to retrieve repository information and commit data.

#### Creating a GitHub Personal Access Token

1. Navigate to [https://github.com/settings/tokens](https://github.com/settings/tokens) (or in GitHub, go to **Settings > Developer settings > Personal access tokens**).
2. Click **Generate new token** (or **Generate new token (classic)** for classic tokens).
3. Configure the token with the following settings:
   - **Note**: Enter a descriptive name (e.g., "Code Metrics Integration")
   - **Expiration**: Set an appropriate expiration date (recommended: 90 days to 1 year)
4. Under **Select scopes**, grant the following permissions:
   - **`public_repo`**: Provides access to public repositories
   - **`read:org`**: Allows reading organization data
   - **`read:project`**: Allows reading project board data
   - **`repo:status`**: Provides access to commit status information
5. Click **Generate token** and copy it immediately (it won't be shown again).

For more information, see the [GitHub Personal Access Token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

### Configuration

Configure the `codeManagement.github` server object in the `remote-config.yaml` file:

```yaml
# remote-config.yaml
---
codeManagement:
  github:
    servers:
      - id: example-github
        url: https://github.com
        apiKey: "${secret.GITHUB_PAT}"
        authMethod: BEARER_TOKEN
```

For GitHub Enterprise, use your enterprise GitHub URL:

```yaml
# remote-config.yaml
---
codeManagement:
  github:
    servers:
      - id: example-github-enterprise
        url: https://github.enterprise.com
        apiKey: "${secret.GITHUB_ENTERPRISE_PAT}"
        authMethod: BEARER_TOKEN
```

> **Note**
> Store the token securely using the [secrets management](./secret_management.md) mechanism rather than storing it directly in the configuration file.

### Workload Configuration

In your `workload-config.yaml` file, reference the GitHub server:

```yaml
# workload-config.yaml
---
workloads:
  - id: my-workload
    # ... other workload config
    codeManagement:
      type: github
      serverId: example-github
      projectName: my-organisation
      repoGroups:
        backend:
          components:
            - repo: my-repository
            - repo: another-repository
```

The `projectName` parameter is required and should match your GitHub organization (or your GitHub username if the repository is a personal one).

The repository group name, such as `backend` in the example above, is an arbitrary name you assign to group related repositories together. See the [workload configuration documentation](./config_workloads.md) for more details.

## Best Practices

- **Token Security**: Always use the [secrets management](./secret_management.md) system to store authentication tokens. Never commit tokens to version control.
- **Token Rotation**: Periodically rotate your tokens and revoke old tokens.
- **Minimal Permissions**: Grant only the minimum required scopes to reduce security risk.
- **Service Accounts**: For production integrations, consider using dedicated service accounts rather than personal accounts.
- **Token Expiration**: Set reasonable expiration dates on tokens, depending on your organization's policy.

---

## Troubleshooting

### Authentication Failures

If you encounter authentication errors:

- Verify the token has not expired
- Confirm the token has the required scopes
- Ensure the token is correctly stored in your secrets configuration
- Check that the `url` field matches your organization's server address

### Repository Not Found

If Code Metrics cannot locate a repository:

- Verify the `projectName` matches the actual project or organisation name in your code management system. For GitHub, ensure the project is the organization (e.g., `my-org`)
- Confirm the token has access to the specified repository
- Check that the repository is not archived or private without proper permissions
