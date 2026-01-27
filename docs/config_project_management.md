# Remote Configuration: Project Management

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

You can report on, query and analyse bugs/defect tickets you've logged in your project management system, such as Jira.

## Configuring bugs

To configure bugs, you need to:

- add your project management tool to the `ticketManagement` section of the [remote configuration](./config_project_management.md) file
- refer to the server ID and type within the `projectManagement` section of a workload configuration

---

## Azure DevOps (ADO)

### Access

> Note the same token value may also be used for retrieving VCS info within the [code management](./config_code_management.md) configuration if required and permission is provided within the token scope.

1. Create an Azure Personal Access Token.  
   To call ADO you'll need to authenticate with a PAT. See instructions [here](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).

2. Paste the result in your respective `remote-config.yaml` file configuration within a `ticketManagement.azure` server object's `apiKey` field.

### Example

Extract from the `remote-config.yaml` file:

```yaml
ticketManagement:
  azure:
    servers:
      - id: "example-azure"
        url: "https://dev.azure.com/my-organization"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.AZURE_DEVOPS_PAT}
        defaults:
          ticketPriorities:
            - "0"
            - "1"
            - "2"
            - "3"
            - "4"
          ticketTypes:
            - "Bug"
            - "Defect"
            - "Issue"
```

> **Note**
> Set the `AZURE_DEVOPS_PAT` secret in your [secrets configuration](./secret_management.md).

Extract from the `workload-config.yaml` file:

```yaml
workloads:
  - id: "my-workload"
    # ... other workload config
    projectManagement:
      type: azure
      serverId: example-azure
      team: "my-team"
      projectName: "MyProject"
      teamFilterQuery: "AreaPath eq 'MyProject\\MyTeam'"
```

### Defaults

**Bugs**

A list of issue names to match for tickets considered within the instance overall to match to the classification of a 'Bug' or 'Defect' type of ticket (may consider escaped and caught issues in delivery to production).

**Incidents**

A list of issue names to match for tickets considered within the instance overall to match to the classification of an 'Incident' type of ticket (considers escaped tickets delivered to production only).

## Jira

### Access

For Jira set the server URL and authentication details, using either:

- The email address that you use to access JIRA and API token that you have generated (`"authType": "BASIC_AUTH"`), or
- The API token that you have generated (`"authType": "BEARER_TOKEN"`).

To call JIRA you'll need to authenticate with either an API token, or a combination of email address and API token. See instructions [here](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).

Add the JIRA token (and email address if used) to your `remote-config.yaml` file configuration within a `ticketManagement.jira` server object.

### Example

Extract from the `remote-config.yaml` file:

```yaml
ticketManagement:
  jira:
    servers:
      - id: "example-jira"
        url: "https://example.atlassian.net"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.JIRA_API_TOKEN}
        defaults:
          ticketPriorities:
            - Lowest
            - Low
            - Medium
            - High
            - Highest
          ticketTypes:
            - "Bug"
            - "Defect"
            - "Issue"
```

> **Note**
> Set the `JIRA_API_TOKEN` secret in your [secrets configuration](./secret_management.md).

> **Note**
> Jira integration uses the V3 REST API by default. This can be changed using the `JIRA_CLIENT` environment variable. See [Environment Variables](./env_vars.md) for configuration options.

Extract from the `workload-config.yaml` file:

```yaml
workloads:
  - id: "my-workload"
    # ... other workload config
    projectManagement:
      type: jira
      serverId: example-jira
      projectName: "MyProject"
      teamFilterQuery: "team = 'MyTeam'"
```

### Defaults

A list of issue names to match for tickets considered within the instance overall to match to the classification of a 'Bug' or 'Defect' type of ticket (may consider escaped and caught issues in delivery to production).

**Ticket Priorities**

A list of string values to match for priority options available within the JIRA instance for each ticket type.

## GitHub Issues

### Access

GitHub Issues supports two authentication methods:

1. **GitHub App Authentication** (Recommended for organizations)
2. **Personal Access Token (PAT)** (Simple setup for individual use)

#### GitHub App Authentication (Recommended)

GitHub Apps provide more secure and scalable authentication, especially for organization repositories. They offer:

- Higher rate limits (5000 requests/hour per installation)
- Fine-grained permissions
- Organization-approved access (bypasses third-party restrictions)
- Better audit trail

**Setup:**
See the comprehensive [GitHub App Authentication Guide](./authentication_github_app.md) for detailed setup instructions.

**Quick Configuration:**

```yaml
ticketManagement:
  github:
    servers:
      - id: "github-app"
        url: "https://api.github.com"
        authMethod: "GITHUB_APP"
        githubApp:
          appId: "123456"
          privateKey: |
            -----BEGIN RSA PRIVATE KEY-----
            (your private key here)
            -----END RSA PRIVATE KEY-----
          installationId: "12345678"
        defaults:
          owner: "my-organization"
          repo: "my-repository"
          # ... other defaults
```

#### Creating a GitHub Personal Access Token

1. Navigate to [https://github.com/settings/tokens](https://github.com/settings/tokens) (or in GitHub, go to **Settings > Developer settings > Personal access tokens**).
2. Click **Generate new token** (or **Generate new token (classic)** for classic tokens).
3. Configure the token with the following settings:
   - **Note**: Provide a descriptive name (e.g., "CodeMetrics Issues Access")
   - **Expiration**: Set an appropriate expiration date
   - **Scopes**: Select the following scopes:
     - `repo` (for private repositories) or `public_repo` (for public repositories only)
     - `read:org` (if using organization issue types)
4. Click **Generate token** and copy it immediately (it won't be shown again).

For more information, see the [GitHub Personal Access Token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

### Example

Extract from the `remote-config.yaml` file:

```yaml
ticketManagement:
  github:
    servers:
      - id: "example-github"
        url: "https://api.github.com"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.GITHUB_PAT}
        defaults:
          owner: "my-organization"
          repo: "my-repository"
          ticketTypes:
            - "bug"
            - "feature"
            - "enhancement"
          ticketPriorities:
            - "low"
            - "medium"
            - "high"
            - "critical"
          stateFilter: "all"
          labelMapping:
            "priority/low": "Low"
            "priority/medium": "Medium"
            "priority/high": "High"
            "priority/critical": "Critical"
```

For GitHub Enterprise, use your enterprise GitHub API URL:

```yaml
ticketManagement:
  github:
    servers:
      - id: "example-github-enterprise"
        url: "https://github.enterprise.com/api/v3"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.GITHUB_ENTERPRISE_PAT}
        defaults:
          owner: "enterprise-org"
          repo: "enterprise-repo"
          ticketTypes:
            - "issue"
            - "bug"
            - "feature"
          stateFilter: "all"
```

> **Note**
> Set the `GITHUB_PAT` or `GITHUB_ENTERPRISE_PAT` secret in your [secrets configuration](./secret_management.md).

Extract from the `workload-config.yaml` file:

```yaml
workloads:
  - id: "my-workload"
    # ... other workload config
    projectManagement:
      type: github
      serverId: example-github
      owner: "my-organization"
      repo: "my-repository"
      ticketTypes:
        - "bug"
        - "feature"
        - "enhancement"
      ticketPriorities:
        - "low"
        - "medium"
        - "high"
        - "critical"
      stateFilter: "all"
      labelMapping:
        "priority/low": "Low"
        "priority/medium": "Medium"
        "priority/high": "High"
        "priority/critical": "Critical"
        "type/bug": "Bug"
        "type/feature": "Feature"
```

### Configuration Options

#### Required Fields

- `owner`: The GitHub organization or username that owns the repository
- `repo`: The repository name containing the issues
- `ticketTypes`: List of issue types to include (matched against GitHub labels or organization issue types)

#### Optional Fields

- `ticketPriorities`: List of priority levels to filter by (requires `labelMapping`)
- `stateFilter`: Filter issues by state - `"all"` (default), `"open"`, or `"closed"`
- `labelMapping`: Map GitHub labels to priority levels or issue types

#### Label Mapping Examples

Map GitHub labels to priorities:

```yaml
labelMapping:
  "priority/low": "Low"
  "priority/medium": "Medium"
  "priority/high": "High"
  "priority/critical": "Critical"
```

Map GitHub labels to issue types:

```yaml
labelMapping:
  "type/bug": "Bug"
  "type/feature": "Feature"
  "type/enhancement": "Enhancement"
```

### Defaults

**Ticket Types**

A list of issue types to match for tickets. These are matched against:

1. GitHub organization issue types (if available and you have `read:org` permission)
2. GitHub labels on issues

**Ticket Priorities**

A list of priority levels that can be mapped from GitHub labels using the `labelMapping` configuration.

### Troubleshooting GitHub Issues Integration

This section helps resolve common issues when configuring GitHub Issues for ticket management in CodeMetrics.

#### Common Configuration Issues

##### Authentication Problems

**Issue: "Authentication failed" or "401 Unauthorized" errors**

_Symptoms:_

- Error messages about authentication failures
- Empty results when issues should be present
- API rate limit errors appearing immediately

_Solutions:_

1. **Verify Personal Access Token (PAT)**

   - Ensure your GitHub PAT is correctly set in your secrets configuration
   - Check that the token hasn't expired
   - Verify the token has the required scopes:
     - `repo` (for private repositories) or `public_repo` (for public repositories)
     - `read:org` (if using organization issue types)

2. **Check Token Permissions**

   ```bash
   # Test your token with curl
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/user
   ```

3. **Verify Repository Access**
   - Ensure the token has access to the specified repository
   - Check that the repository exists and is accessible
   - For organization repositories, verify you have the necessary permissions

**Issue: "Repository not found" or "403 Forbidden" errors**

_Symptoms:_

- Error messages about repository access
- Issues not appearing despite correct configuration

_Solutions:_

1. **Check Repository Configuration**

   - Verify the `owner` and `repo` values in your configuration
   - Ensure the repository name matches exactly (case-sensitive)
   - For organizations, use the organization name as the `owner`

2. **Verify Repository Permissions**
   - Check that your GitHub account has read access to the repository
   - For private repositories, ensure your PAT has `repo` scope
   - For organization repositories, verify you're a member with appropriate permissions

##### Configuration Issues

**Issue: No issues are returned despite correct authentication**

_Symptoms:_

- Authentication works but no issues appear
- Empty results in queries and reports

_Solutions:_

1. **Check Issue Type Configuration**

   ```yaml
   # Ensure ticketTypes match your GitHub labels or organization issue types
   ticketTypes:
     - "bug" # Must match GitHub labels exactly
     - "feature"
     - "enhancement"
   ```

2. **Verify State Filter**

   ```yaml
   # Check if stateFilter is too restrictive
   stateFilter: "all" # Try "all" instead of "open" or "closed"
   ```

3. **Test with Minimal Configuration**
   ```yaml
   # Start with minimal configuration to test connectivity
   projectManagement:
     type: github
     serverId: your-github-server
     owner: "your-org"
     repo: "your-repo"
     ticketTypes:
       - "bug"
     stateFilter: "all"
   ```

**Issue: Issues appear but with incorrect priorities or types**

_Symptoms:_

- Issues are retrieved but show as "Unknown" priority
- Issue types don't match expectations

_Solutions:_

1. **Check Label Mapping Configuration**

   ```yaml
   labelMapping:
     "priority/high": "High" # GitHub label -> Display value
     "priority/medium": "Medium"
     "priority/low": "Low"
     "type/bug": "Bug"
     "type/feature": "Feature"
   ```

2. **Verify GitHub Labels**
   - Check that your GitHub issues have the labels specified in `labelMapping`
   - Ensure label names match exactly (case-sensitive)
   - Use GitHub's web interface to verify label names

##### GitHub Enterprise Issues

**Issue: Connection failures with GitHub Enterprise**

_Symptoms:_

- Timeouts or connection errors
- SSL/TLS certificate errors
- API endpoint not found errors

_Solutions:_

1. **Verify Enterprise URL**

   ```yaml
   # Ensure the URL includes the API path
   url: "https://github.enterprise.com/api/v3" # Correct
   # Not: "https://github.enterprise.com"        # Incorrect
   ```

2. **Test API Connectivity**
   ```bash
   # Test API endpoint directly
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://github.enterprise.com/api/v3/user
   ```

#### Debugging Steps

1. **Verify Basic Connectivity**

   ```bash
   # Replace YOUR_TOKEN with your actual token
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/repos/OWNER/REPO/issues?state=all&per_page=1
   ```

2. **Check Configuration Syntax**
   ```yaml
   # Example minimal working configuration
   ticketManagement:
     github:
       servers:
         - id: "test-github"
           url: "https://api.github.com"
           authMethod: "BEARER_TOKEN"
           apiKey: "${secret.GITHUB_PAT}"
           defaults:
             owner: "your-org"
             repo: "your-repo"
             ticketTypes:
               - "bug"
             stateFilter: "all"
   ```

#### API Token Requirements

**Required Scopes:**

For **public repositories**:

- `public_repo`
- `read:org` (optional, for organization issue types)

For **private repositories**:

- `repo`
- `read:org` (optional, for organization issue types)

**Token Permissions Verification:**

```bash
# Check user permissions
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/user

# Check repository access
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.github.com/repos/OWNER/REPO
```

#### Common Error Messages

| Error Message             | Likely Cause                          | Solution                                      |
| ------------------------- | ------------------------------------- | --------------------------------------------- |
| "Bad credentials"         | Invalid or expired PAT                | Generate a new PAT with correct scopes        |
| "Not Found"               | Repository doesn't exist or no access | Check repository name and permissions         |
| "API rate limit exceeded" | Too many API calls                    | Wait for rate limit reset or optimize queries |
| "Validation Failed"       | Invalid API parameters                | Check configuration syntax and values         |

## ServiceNow

ServiceNow can be used as an issue provider for incidents.

### Access

To call ServiceNow you'll need to authenticate with a REST API key. See instructions [here](https://www.servicenow.com/community/developer-advocate-blog/inbound-rest-api-keys/ba-p/2854924).

The scope required is limited to read-only access to the Table API, specifically the `incident` table.

### Configuration

Configure the `remote-config.yaml` file configuration within a `ticketManagement.servicenow` server object:

```yaml
ticketManagement:
  servicenow:
    servers:
      - id: "my-servicenow"
        url: "https://<your-instance>.service-now.com"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.SERVICENOW_API_KEY}
```

> **Note**
> Set the `SERVICENOW_API_KEY` secret in your [secrets configuration](./secret_management.md).

## No project management provider

In the case where no project management provider is used, the `ticketManagement` type should be set to `none`.

```yaml
# remote-config.yaml
---
ticketManagement:
  none:
    - id: none
```

In the associated [workload configuration](./config_workloads.md), the `projectManagement` type should be set to `none`.

```yaml
# workload-config.yaml
---
workloads:
  - id: athena
    projectManagement:
      type: none
      serverId: none
```
