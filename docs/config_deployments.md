# Configuration: Deployments

This section describes the `pipeline-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

Deployment configuration is required to calculate [DORA metrics](./dora.md) and other deployment metrics.

### Choosing a deployment provider

Deployment data is provided by a `pipeline` system, such as Jenkins or GitHub Actions. To get started, ensure you have [configured your pipeline provider](./config_pipelines.md).

Note that for some teams, deployment data may be provided by a different system to the build pipeline, such as a deployment tool or a monitoring system. CodeMetrics allows you to choose the pipeline provider that provides your deployment data. It can be the same pipeline provider as you use for builds, or a different one.

Deployment configurations can be shared across multiple teams, or can be specific to a single team. This allows you to model your deployments in a way that makes sense for your organisation.

### Mapping a deployment to a commit

To calculate deployment metrics, CodeMetrics needs to know which commit a deployment relates to. This is done by mapping a commit SHA to a property in the pipeline provider's run data. This is done using the `commitMapping` property in the deployment configuration.

## Examples

### Simple example

Here is how you might configure a single workload to have a deployment stage:

```yaml
# pipeline-config.yaml
---
stages:
  - id: my-deployments
    description: The deployment stage of our pipeline
    type: github
    serverId: my-github-server
    projectName: "my-project"
    commitMapping:
      runProperty: "$.data.head_sha"
```

Explanation:

- `id` - A unique identifier for this deployment configuration. You will use this ID to reference this configuration in the workload configuration.
- `description` - A human-readable description of this deployment configuration.
- `type` - The type of deployment provider. This can be any supported pipeline provider, such as `github`, `jenkins`, `bitbucket`, `dynatrace` etc.
- `serverId` - The ID of the pipeline provider server. This is the ID you configured in the [pipeline configuration](./config_pipelines.md).
- `projectName` - The name of the project in the pipeline provider. This follows the same configuration rules as the `projectName` in the pipeline configuration.
- `commitMapping` - A mapping of the commit SHA to the pipeline provider's run property. This is used to match deployments to the correct commits. In this example, the GitHub Actions property `head_sha` is used to determine the commit that triggered the deployment.

Once you have configured your deployment provider, you can reference it in your workload configuration.

```yaml
# workload-config.yaml
---
workloads:
  - id: my-workload
    description: My workload
    # ...
    # other workload configuration
    # ...
    deployment:
      deploymentId: my-deployments
```

Explanation:

- `deployment` - The deployment configuration for this workload. This references the `id` of the deployment configuration you want to use.

> **Note**
> See the [workload configuration](./config_workloads.md) for more information about workloads.

### Dynatrace as a deployment provider

Some teams publish their deployment events to Dynatrace. If your team does this, you can configure CodeMetrics to use Dynatrace as a deployment provider.

First, ensure you have [configured your Dynatrace pipeline provider](./config_pipelines.md).

Then, configure the deployment provider in `pipeline-config.yaml`:

```yaml
# pipeline-config.yaml
---
stages:
  - id: dt-deployment-events
    description: Dynatrace deployment events
    type: dynatrace
    serverId: my-dynatrace
    projectName: "unused"
    commitMapping:
      runProperty: "$.commit-sha"
```

Explanation:

- `type` - The type of deployment provider. In this example, the deployment provider is `dynatrace`.
- `serverId` - The ID of the Dynatrace server. This is the ID you configured in the [pipeline configuration](./config_pipelines.md).
- `projectName` - This is not used for Dynatrace.
- `commitMapping` - A mapping of the commit SHA to the pipeline provider's run property. In this example, the Dynatrace metric dimension `commit-sha` is used to determine the commit that triggered the deployment. This will be specific to the way your team publishes deployment events to Dynatrace. 

---

## Mapping code repositories to deployment jobs

In some cases, your deployment job names may not match your repository names. You can map your deployment jobs to your repositories using the `jobMapping` property.

Here is an example of how you might map your deployment jobs to your repositories:

```yaml
# pipeline-config.yaml
---
stages:
  - id: my-deployments
    description: The deployment stage of our pipeline
    type: github
    serverId: my-github-server
    projectName: "my-project"
    commitMapping:
      runProperty: "$.data.head_sha"
    jobMapping:
      my-repo: my-deployment-job
```

Explanation:

- `jobMapping` - A mapping of the repository name to the deployment job name. In this example, the repository `my-repo` is mapped to the deployment job `my-deployment-job`.

## Mapping deployment events to commits

Your deployment events must have a way of determining the commit SHA.

The mapping uses JSONPath to extract the commit SHA from the deployment event data. The JSONPath expression is evaluated against the deployment event data, and the result is used as the commit SHA.

For example, if your deployment event data looks like this:

```json
{
  "data": {
    "head_sha": "abcdef123456"
  }
}
```

...you can use the JSONPath expression `$.data.head_sha` to extract the commit SHA.

If your deployment provider does not have a property that maps directly to the commit SHA, you may be able to add a tag or parameter to your deployment events that contains the commit SHA. You can then use the `commitMapping` property to map this tag to the commit SHA.
