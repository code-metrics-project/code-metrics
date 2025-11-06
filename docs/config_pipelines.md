# Remote Configuration: CI/CD Pipelines

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Azure DevOps (ADO)

> Note the same token value may also be used for retrieving VCS info within the [code management](./config_code_management.md) configuration if required and permission is provided within the token scope.

Within a `pipelines.azure` server object:

1. Add a unique `id` value for the target server.

2. Add the `url` endpoint of the ADO instance.

3. Create an Azure Personal Access Token.
   To call ADO you'll need to authenticate with a PAT. See instructions [here](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).

4. Add the PAT value to the object's `apiKey` field.

5. Add a list of `branches` you want to have the option to analyse for your projects (TODO: Align with Workloads)

## GitHub

Within a `pipelines.github` server object:

1. Add a unique `id` value for the target server.

2. Create a Personal Access Token.
   Navigate to [https://github.com/settings/tokens](https://github.com/settings/tokens) and create a token with the following scopes:

    - public_repo
    - read:org
    - read:project

3. Paste the result into the server object's `apiKey` field.

4. Add a list of `branches` you want to have the option to analyse for your projects (TODO: Align with Workloads)

```yaml
pipelines:
  github: 
    servers:
      - id: CodeMetrics 
        url: 'https://api.github.com'
        apiKey: ${secret.github_api_key}
        branches:
          - main
```

## Jenkins

Within a `pipelines.jenkins` server object:

1. Add a unique `id` value for the target server.

2. Add url and access credentials to the url field following the basic auth structure:
   https://`user`:`key`@`jenkins.server.url`

3. Add a list of `branches` you want to have the option to analyse for your projects

## Dynatrace

Some teams use Dynatrace to monitor their pipelines. This configuration allows you to retrieve data from Dynatrace to monitor the success, duration and frequency of your pipelines.

Within a `pipelines.dynatrace` server object:

1. Add a unique `id` value for the target server.
2. Add the `url` endpoint of the Dynatrace instance.
3. Add the `apiKey` value for the Dynatrace API.
4. Set the `metricSelector` to your query and, optionally, the `entitySelector` to filter the data you want to retrieve.
5. Set the dimension names to the names of the dimensions of the metric in your query.
6. Set the `successfulOutcomeValue` to the value that indicates a successful build.

```yaml
pipelines:
  dynatrace:
    servers:
      - id: "example-dynatrace"
        url: "https://example-instance.live.dynatrace.com"
        apiKey: "${secret.dynatrace-api-key}"
        metricSelector: "your.query.here"
        #entitySelector: builtin.foo.bar
        successfulOutcomeValue: "1"
        dimensionNames:
          runId: "commit-sha"
          startDate: "start-time-utc"
          endDate: "end-time-utc"
          outcome: "build-success"
          branch: "branch-name"
          repository: "repository"
          jobName: "deploy-job-name"
```

Here is an example `metricSelector`, which queries a custom metric in Dynatrace, named `example.pipelines.deployment`:

```
example.pipelines.deployment
    :splitBy(commit-sha,environment,start-time-utc,end-time-utc,build-success,repository,deploy-job-name)
    :filter(eq(environment,production))
```

## No pipeline provider

In the case where no pipeline provider is used, the `pipelines` type should be set to `none`.

```yaml
# remote-config.yaml
---
pipelines:
  none:
    - id: none
```

In the associated [workload configuration](./config_workloads.md), the `pipelines` type should be set to `none`.

```yaml
# workload-config.yaml
---
workloads:
  - id: athena
    pipelines:
      type: none
      serverId: none
```
