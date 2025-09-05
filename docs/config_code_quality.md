# Configuration: Code Quality

This section is part of the `remote-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## SonarQube and SonarCloud

Code Metrics supports both SonarQube and SonarCloud as code quality providers. The configuration is similar for both.

### SonarCloud

For SonarCloud, set the `url` to `https://sonarcloud.io` and use a SonarCloud token generated from the `Account > Security` page.

### SonarQube

For SonarQube, set the `url` to the server URL, and use a token with appropriate API permissions generated from the instance, as follows:

- Navigate to `Administration > Users`
- Create an access token to enable read only access

> It is recommended a service user is created for this integration.
> See [further instructions](https://docs.sonarsource.com/sonarqube-server/latest/user-guide/managing-tokens/).

### Configuration file

Configure the `codeAnalysis.sonar` server object in the `remote-config.yaml` file.

> **Note**
> You should strongly prefer using the [secrets management](./secret_management.md) mechanism to store the token,
> rather than storing it directly within the configuration file.

If no `authMethod` is specified then `BASIC_AUTH` is used.
```yaml
# remote-config.yaml
---
codeAnalysis:
  sonar:
    servers:
      - id: example-sonar
        url: https://example-sonar-server
        apiKey: "${secret.SONAR_API_KEY}"
        authMethod: BEARER_TOKEN
```


The branch to use for sonar (as the default branch on sonar server may not match the repo branch used) can also be specified on a per workload config. If omitted it will default to main.

```yaml
# workload-config.yaml
---
workloads:
  - id: athena
    codeAnalysis:
      type: sonar
      serverId: example-sonar
      branch: primary
```

### Component name prefix

In some environments, it may be required to prepend a string to component names when querying Sonar.

For example, if your repository names are 'frontend' and 'backend' but your Sonar components are named 'projname_frontend' and 'projname_backend'.

You can set a `componentKeyPrefix` key in the `remote-config.yaml` for a given Sonar server. The prefix is prepended to all component keys when querying Sonar.

## No code quality provider

In the case where no code quality provider is used, the `codeAnalysis` type should be set to `none`.

```yaml
# remote-config.yaml
---
codeAnalysis:
  none:
    - id: none
```

In the associated [workload configuration](./config_workloads.md), the `codeAnalysis` type should be set to `none`.

```yaml
# workload-config.yaml
---
workloads:
  - id: athena
    codeAnalysis:
      type: none
      serverId: none
```
