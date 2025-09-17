# Configuration: Project Management

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

-   The email address that you use to access JIRA and API token that you have generated (`"authType": "BASIC_AUTH"`), or
-   The API token that you have generated (`"authType": "BEARER_TOKEN"`).

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
