# Configuration: Workloads

This section describes the `workload-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

A workload represents one or more repositories, in one or more repository groups. With this concept, you can model a team, an application or a single component.

You can also group workloads using [tags](./tags.md).

> **Note**
> See the [workload concept](./workloads.md) section.

## Examples

### Grouping by layer

Here is how you might model a team with frontend and backend repositories:

```yaml
# a team with 'frontend' and 'backend' repositories

workloads:
  - id: team-athena
    codeManagement:
      type: github
      serverId: example-github
      projectName: athena
      repoGroups:
        backend:
          components:
            - repo: example-api
            - repo: another-api
        frontend:
          components:
            - repo: customer-web
            - repo: admin-web
    codeAnalysis:
      type: sonar
      serverId: example-sonar
    projectManagement:
      type: jira
      serverId: example-jira
      project: ATH
```

A monorepo example with multiple components, each with its own Sonar mapping.

```yaml
workloads:
  - id: CodeMetricsMonoRepo
    name: "CodeMetrics"
    codeManagement:
      type: github
      serverId: CodeMetrics
      projectName: code-metrics-user-org
      repoGroups:
        CodeMetricsCore:
          components:
            - repo: /code-metrics/
              name: backend
              paths: ["/backend"]
            - repo: /code-metrics/
              name: ui
              paths: ["/ui"]
        CodeMetricsML:
          components:
            - repo: /code-metrics/
              name: machinelearning
              paths: ["/machinelearning"]
    codeAnalysis:
      type: sonar
      serverId: example-sonar
      mappings:
        - key: ml
          componentName: machinelearning
        - key: code-metrics-ui
          componentName: ui
    pipelines:
      type: github
      serverId: CodeMetrics
      projectName: code-metrics-user-org
      jobGroups:
        CodeMetrics:
          jobNames:
            - code-metrics
    projectManagement:
      type: jira
      serverId: mock-jira
      teamFilterJql: '"Team name[Dropdown]" in ("Gaia")'
      project: DEV
      prodFilterJql: '"Project Environment[Dropdown]" = PROD'
```

> **Note**
> Repository group names, such as `backend` are arbitrary. You can name these groups whatever you like.

Here is how you might recreate the previous configuration, by using regular expressions to match repository names:

```yaml
# a team with 'frontend' and 'backend' repositories, matched using regular expressions

workloads:
  - id: team-athena
    codeManagement:
      type: github
      serverId: example-github
      projectName: athena
      repoGroups:
        # match all repositories that end in '-api' using a regular expression
        backend:
          components:
            - repo: "/.*-api/"
        # match all repositories that end in '-web' using a regular expression
        frontend:
          components:
            - repo: "/.*-web/"
    codeAnalysis:
      type: sonar
      serverId: example-sonar
    projectManagement:
      type: jira
      serverId: example-jira
      project: ATH
```

Here is how you might recreate the previous configuration, by using Sonar tags to look up repository names:

```yaml
# a team with 'frontend' and 'backend' repositories, looked up via tags in Sonar

workloads:
  - id: team-athena
    codeManagement:
      type: github
      serverId: example-github
      projectName: athena
      repoGroups:
        # determine the backend repos based on their tags in Sonar
        backend:
          sonarTags:
            - "be"
        # determine the frontend repos based on their tags in Sonar
        frontend:
          sonarTags:
            - "fe"
    codeAnalysis:
      type: sonar
      serverId: example-sonar
    projectManagement:
      type: jira
      serverId: example-jira
      project: ATH
```

### Grouping by application

Here is how you might model a team with multiple applications:

```yaml
# a team with multiple applications

workloads:
  - id: team-hera
    codeManagement:
      type: github
      serverId: example-github
      projectName: hera
      repoGroups:
        account-app:
          components:
            - repo: accounts-web
            - repo: accounts-api
            - repo: accounts-infra
        sales-app:
          components:
            - repo: sales-portal
            - repo: sales-api
            - repo: sales-platform
    codeAnalysis:
      type: sonar
      serverId: example-sonar
    projectManagement:
      type: jira
      serverId: example-jira
      project: HER
```

## Repository and Sonar mappings

When CodeMetrics looks up quality metrics about a repository, the query to Sonar uses the repository name as the component 'key' parameter by default.

It is possible to specify a different key for a given repository using the `mappings` property within the `codeAnalysis` section of a workload.

```yaml
workloads:
  - id: example-workload
    # ... other config ...
    codeAnalysis:
      type: sonar
      serverId: example-sonar
      mappings:
        - key: petclinic
          componentName: spring-petclinic
```

In this example, CodeMetrics would use the Sonar component key `petclinic` for the repository named `spring-petclinic`.

You can also map by VCS repository name:

```yaml
workloads:
  - id: example-workload
    codeAnalysis:
      type: sonar
      serverId: example-sonar
      mappings:
        - key: my-sonar-project
          vcsRepoName: my-repo
```

## Deployment configuration

To model deployments for a workload, you can reference a deployment configuration by its ID.

```yaml
workloads:
  - id: team-athena
    # ...
    # other workload configuration
    # ...
    deployment:
      deploymentId: my-deployments
```

In this example, the workload `team-athena` references the deployment configuration `my-deployments`.

To learn more about deployments, see the [deployment configuration](./config_deployments.md) section.

## Quality gates configuration

To attach quality gates to a workload, reference a quality gates configuration by its ID and version.

```yaml
workloads:
  - id: team-athena
    # ...
    # other workload configuration
    # ...
    qualityGates:
      id: default
      version: 0.1.0
```

In this example, the workload `team-athena` references the quality gates configuration with ID `default` at version `0.1.0`.

See the [quality gates configuration](./config_quality_gates.md) section for the full schema and examples.
