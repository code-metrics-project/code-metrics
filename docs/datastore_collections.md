# Datastore Collections

CodeMetrics uses the following collections across its datastore. These are created automatically on first access unless `DATASTORE_AUTO_CREATE=false` is set (see [Datastores](datastores.md)).

| Collection Name       | Used By                               |
| --------------------- | ------------------------------------- |
| `ado-issues-by-date`  | Azure DevOps Issues                   |
| `alerts`              | GitHub Dependency Alerts              |
| `commit-prs`          | VCS (all providers)                   |
| `deploy-bounds`       | Deployments                           |
| `dynatrace-events`    | Dynatrace Pipelines                   |
| `earliest-commits`    | VCS (all providers)                   |
| `fetch-file`          | VCS (all providers)                   |
| `fetch-merge-rules`   | VCS (all providers)                   |
| `github-issues`       | GitHub Issues                         |
| `issues`              | Jira Issues, ServiceNow Issues        |
| `pipeline-executions` | Azure Pipelines, GitHub Pipelines     |
| `pipelines-job-names` | Pipelines (all providers)             |
| `queries`             | Stored Queries                        |
| `repo-changes`        | Bitbucket Server VCS, GitHub VCS      |
| `repo-commits`        | Bitbucket Server VCS, GitHub VCS      |
| `token_ids`           | Authentication (long-lived token IDs) |
| `tokens`              | Authentication (server tokens)        |
| `vcs-cache`           | VCS (all providers)                   |
| `vulns`               | Vulnerabilities                       |

## Collection naming by implementation

The collection name shown in the table above is the logical name used in code. Each datastore implementation maps this to a physical resource as follows.

### DynamoDB

Each collection becomes a separate DynamoDB table. The table name is formed by combining a configurable prefix with the collection name:

```
{DATABASE_NAME}_{collectionName}
```

The prefix defaults to `CodeMetrics` if `DATABASE_NAME` is not set. For example, the `vcs-cache` collection becomes the table `CodeMetrics_vcs-cache`.

### MongoDB

Each collection is stored as a MongoDB collection within a single database. The collection name is used as-is; only the database name is configurable:

```
DATABASE_NAME  (default: code-metrics)
└── collectionName  (e.g. vcs-cache)
```

For example, the `vcs-cache` collection is stored in the `code-metrics` database as the collection `vcs-cache`.

### NeDB (local file database)

Each collection is stored as a separate file on disk. The file name is formed from a fixed prefix and the collection name:

```
{DATASTORE_PATH}/code-metrics-{collectionName}.db
```

For example, the `vcs-cache` collection is stored at `{DATASTORE_PATH}/code-metrics-vcs-cache.db`. If `DATASTORE_PATH` is not set, NeDB operates in-memory.

### In-memory

Each collection is held in process memory under its logical name with no transformation. No physical resource is created.
