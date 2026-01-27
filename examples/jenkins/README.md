# Example Jenkins instance

A simple example Jenkins instance.

Contains a single pipeline job that should pass/fail 50% of the time.

## Start

```shell
docker compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml compose/docker-compose-examples.yaml --project-directory . up --build
```

Jenkins is accessible at http://localhost:32769

Log in with `admin:admin` to execute jobs.

## Configure CodeMetrics

Add an entry to `remote-config.yaml`:

```yaml
# ... other config

pipelines:
  servers:
    - id: example-jenkins
      url: "http://admin:admin@localhost:32769"
      branches:
        - main
```

Refer to this server in `workload-config.yaml`:

```yaml
workloads:
  - id: athena
    pipelines:
      type: jenkins
      serverId: example-jenkins
      jobGroups:
        backend:
          jobNames:
            - pipeline
    codeManagement:
      # ... other config
    codeAnalysis:
      # ... other config
    projectManagement:
      # ... other config
```
