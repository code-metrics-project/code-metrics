# <img alt="CodeMetrics logo" src="img/codemetrics_logo_small.png" width="384em"/>

As your codebase grows, so does the complexity of managing it. As an engineering leader overseeing many code repositories or multiple product teams it is challenging to know where to focus attention. At scale, it is especially hard to spot bad trends before they manifest as risks and identify areas for improvement.

## Managing software at scale

Managing a large technical solution requires metrics from across the phases of the delivery lifecycle. Meaningful understanding of the quality and risk in your codebase includes metrics about your source code, your CI/CD pipeline and your delivery process and service (such as pull requests and bugs).

In most organisations, this poses common problems:

- Metrics sit across separate systems: your Code quality tool (Sonar), project/service management tools (Jira, Azure, ServiceNow), and source hosting platform (GitHub, Bitbucket or Azure).
- You need to correlate the data from across sources to help identify issues or trends that are difficult to spot on a per-tool, or per-repository basis.
- There is no easy mechanism to aggregate and query this data for technical leadership.

## How CodeMetrics helps

CodeMetrics is a tool that aggregates and analyses engineering data across a large and distributed codebase. It provides engineering leaders with visibility of software health across teams and is used on top of existing software engineering tools.

At its core, CodeMetrics provides a collection of whole project lifecycle code quality analysis tools. It enables you to combine sources to look for correlations, to answer questions over time such as:

- the bug to change ratio (related to change failure rate),
- which files are frequently implicated when bugs are fixed,
- how test coverage correlates to incidents,
- how complexity is changing with codebase size,
- how long pull requests take to review and merge,
- how much churn has there been in the codebase,
- DORA metrics (deployment frequency, change failure rate, time to restore service, lead time for changes),
- what quality gates are configured across repositories and services, and
- custom combinations you create.

<img src="/docs/img/pipeline_health.png" alt="Pipeline health" height="220em" />
<img src="/docs/img/time_to_restore_service.png" alt="Time to restore service" height="220em" />
<img src="/docs/img/coverage_summary_cropped.png" alt="Chart types" height="220em" />

## User documentation

This documentation is intended for users of Code Metrics, such as engineers, QA or leadership.

- [Workload summary](./workloads.md)
- [CI/CD pipelines](./pipelines.md)
- [Tags](./tags.md)

### Queries

- [Overview](./queries.md)
- [Bugs and escaped bugs](./query_bugs.md)
- [Bug culprit files](./query_bug_culprits.md)
- [DORA metrics](./dora.md)
- [CI/CD pipelines](./query_pipelines.md)
- [Repository churn](./query_repo_churn.md)
- [Source code metrics](./query_source_code.md)
- [Changes outside working pattern](./query_working_pattern.md)
- [Production incidents](./query_incidents.md)
- [Vulnerabilities](./query_vulnerabilities.md)
- [Change types](./query_change_types.md)
- [Chart types](charts.md)

### Other features

- [Quality gates user guide](./quality_gates_user.md)
- [Vulnerability report upload](./vulnerability_report_upload.md)
- [Prediction](./prediction.md)

## Administration and configuration

This documentation is intended for people deploying and configuring Code Metrics.

### Configuration

- [Getting started](./getting_started.md)
- [Configuration guide](./configuration.md)
- [Datastores](./datastores.md)
- [Secrets management](./secret_management.md)
- [Authentication](./authentication.md)
- [Configure workloads](./config_workloads.md)
- [Configure deployments](./config_deployments.md)
- [Configure project management (bugs)](./config_project_management.md)
- [Configure incidents](./config_incidents.md)
- [Environment variables](./env_vars.md)
- [Custom queries](./custom_queries.md)
- [Quality gates administration guide](./quality_gates_admin.md)

### Deployment

- [Architecture](./architecture.md)
- [Deployment overview](./deployment.md)
- [Docker](./deployment_docker.md)
- [AWS Lambda](./deployment_lambda.md)
- [Kubernetes](./helm.md)
- [Local Node.js](./run_local_node.md)

### Administration Portal

- [Administration Portal](./admin_portal.md)

## Feature support

See a list of [supported features](./features.md) for third party tools.

## Integrating with the CodeMetrics API

- [API Integration Overview](./integration_api.md)
- [Authenticating to the CodeMetrics API](./integration_api_authentication.md)

---

## Design and build

This documentation is intended for consumption by CodeMetrics project maintainers.

- [Developer documentation](./dev/README.md)
- [Standards and patterns](./dev/standards_patterns.md)
- [Mocks](../mocks/README.md)
- [Release process](./dev/release.md)
- [Promotional website](./promosite.md)
