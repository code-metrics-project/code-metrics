# Remote Configuration: Production incidents

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

You can report on, query and analyse incidents that have occurred in your production environment.

Incident tickets in a project management tool or service management tool are supported.

## Configuring incidents

To configure incidents, you need to:

- add your project management tool or service management tool to the `ticketManagement` section of the [remote configuration](./config_project_management.md) file
- refer to the server ID and type within the `incidents` section of a workload configuration

### Using your project management tool (e.g. Jira, GitHub Issues)

This approach applies to teams that raise incidents as tickets in a project management tool (e.g. Jira, GitHub Issues). Incident tickets are typically identified by issue type, project or field value (e.g. `Environment=production`).

#### Jira Remote configuration example

This is a snippet from the `remote-config.yaml` file:

```yaml
ticketManagement:
  jira:
    servers:
      - id: "my-jira"
        url: "https://<your-instance>.jira.com"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.JIRA_API_KEY}
        defaults:
          ticketTypes:
            - Incident
```

> **Note**
> At least one ticket type is required within the `ticketTypes` list.

> **Note**
> Set the `JIRA_API_KEY` secret in your [secrets configuration](./secret_management.md).

> **Note**
> Jira integration uses the V3 REST API by default. This can be changed using the `JIRA_CLIENT` environment variable. See [Environment Variables](./env_vars.md) for configuration options.

If you need to further limit the incidents to be returned, you can add a `filter` to the server configuration:

```yaml
ticketManagement:
  jira:
    servers:
      - id: "my-jira"
        # ...
        filter: "project = MYPROJECT"
```

#### Jira Workload configuration example

This is a snippet from the workload configuration file:

```yaml
workloads:
  - id: "my-workload"
    name: "My workload"
    incidents:
      type: "jira"
      server: "my-jira"
```

If you need to further limit the incidents to be returned, you can add further elements to the workload configuration:

```yaml
workloads:
  - id: "my-workload"
    # ...
    incidents:
      type: "jira"
      server: "my-jira"

      # supported by Jira
      projectName: "MYPROJECT"
      teamFilterQuery: "project=MYPROJECT"

      # supported by Azure DevOps
      project: "my-project"
      team: "my-team"
```

#### GitHub Issues Remote configuration example

GitHub Issues can be used for incident management by configuring specific repositories and issue types for incidents.

This is a snippet from the `remote-config.yaml` file:

```yaml
ticketManagement:
  github:
    servers:
      - id: "my-github-incidents"
        url: "https://api.github.com"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.GITHUB_PAT}
        defaults:
          owner: "my-organization"
          repo: "incidents"
          ticketTypes:
            - "incident"
            - "outage"
            - "service-disruption"
          stateFilter: "all"
          labelMapping:
            "severity/critical": "Critical"
            "severity/high": "High"
            "severity/medium": "Medium"
            "severity/low": "Low"
```

For GitHub Enterprise:

```yaml
ticketManagement:
  github:
    servers:
      - id: "my-github-enterprise-incidents"
        url: "https://github.enterprise.com/api/v3"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.GITHUB_ENTERPRISE_PAT}
        defaults:
          owner: "enterprise-org"
          repo: "production-incidents"
          ticketTypes:
            - "incident"
          stateFilter: "all"
```

> **Note**
> Set the `GITHUB_PAT` or `GITHUB_ENTERPRISE_PAT` secret in your [secrets configuration](./secret_management.md).

#### GitHub Issues Workload configuration example

This is a snippet from the workload configuration file:

```yaml
workloads:
  - id: "my-workload"
    name: "My workload"
    incidents:
      type: "github"
      serverId: "my-github-incidents"
      owner: "my-organization"
      repo: "incidents"
      ticketTypes:
        - "incident"
        - "outage"
        - "service-disruption"
      stateFilter: "all"
      labelMapping:
        "severity/critical": "Critical"
        "severity/high": "High"
        "severity/medium": "Medium"
        "severity/low": "Low"
```

If you need to further limit the incidents to be returned, you can customize the configuration:

```yaml
workloads:
  - id: "my-workload"
    # ...
    incidents:
      type: "github"
      serverId: "my-github-incidents"
      owner: "my-organization"
      repo: "production-incidents"
      ticketTypes:
        - "incident"
      ticketPriorities:
        - "Critical"
        - "High"
      stateFilter: "closed" # Only resolved incidents
      labelMapping:
        "severity/critical": "Critical"
        "severity/high": "High"
```

#### GitHub Issues Troubleshooting

For common issues and solutions when configuring GitHub Issues for incident management, see the troubleshooting section in the [Configure project management documentation](./config_project_management.md#troubleshooting-github-issues-integration).

### Using your service management tool (e.g. ServiceNow)

This approach applies to teams that raise tickets in a dedicated service management tool (e.g. ServiceNow or Jira Service Desk).

#### Remote configuration example

This is a snippet from the `remote-config.yaml` file:

```yaml
ticketManagement:
  servicenow:
    servers:
      - id: "my-servicenow"
        url: "https://<your-instance>.servicenow.com"
        authMethod: "BEARER_TOKEN"
        apiKey: ${secret.SERVICENOW_API_KEY}
```

> **Note**
> Set the `SERVICENOW_API_KEY` secret in your [secrets configuration](./secret_management.md).

#### Authentication methods

There are several authentication methods available for ServiceNow:

| Auth method    | Behaviour                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| `BASIC_AUTH`   | Uses the `email` and API key in the HTTP Basic Authentication method.     |
| `BEARER_TOKEN` | Sends the API key in the `Authorization` header with the `Bearer` prefix. |
| `CUSTOM`       | Sends the API key in the `x-sn-apikey` header.                            |

If you do not wish to use a static API key, you can instead use an OAuth refresh token, which will be used to obtain a short-lived access token when required. Using a refresh token requires the following configuration:

```yaml
ticketManagement:
  servicenow:
    servers:
      - id: "my-servicenow"
        url: "https://<your-instance>.servicenow.com"
        authMethod: "BEARER_TOKEN"
        clientId: "${secret.SERVICENOW_CLIENT_ID}"
        clientSecret: "${secret.SERVICENOW_CLIENT_SECRET}"
        refreshToken: "${secret.SERVICENOW_REFRESH_TOKEN}"
        tokenUrl: "https://<your-instance>.service-now.com/oauth_token.do"
```

> **Note**
> Set the `SERVICENOW_CLIENT_ID`, `SERVICENOW_CLIENT_SECRET` and `SERVICENOW_REFRESH_TOKEN` secrets in your [secrets configuration](./secret_management.md).

#### Workload configuration example

This is a snippet from the workload configuration file:

```yaml
workloads:
  - id: "my-workload"
    name: "My workload"
    incidents:
      type: "servicenow"
      server: "my-servicenow"
```

If you need to further limit the incidents to be returned, you can add further elements to the workload configuration:

```yaml
workloads:
  - id: "my-workload"
    # ...
    incidents:
      type: "servicenow"
      server: "my-servicenow"

      # additional options
      tableName: "non-standard-table-name"
      teamFilterQuery: "project=MYPROJECT"
```

## No incident management provider

In the case where no incident management provider is used, the `ticketManagement` type should be set to `none`.

```yaml
# remote-config.yaml
---
ticketManagement:
  none:
    - id: none
```

In the associated [workload configuration](./config_workloads.md), the `incidents` type should be set to `none`.

```yaml
# workload-config.yaml
---
workloads:
  - id: athena
    incidents:
      type: none
      serverId: none
```
