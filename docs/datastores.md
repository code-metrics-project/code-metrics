# Datastores

Different datastore implementations are supported.

| Name     | Details                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inmem    | In-memory datastore implementation.️ This datastore implementation holds all items in memory for the lifetime of the process. There is no eviction, so growth is infinite with continued insertions. Do not use this in production. |
| dynamodb | AWS DynamoDB datastore. This datastore implementation holds items in external DynamoDB tables.                                                                                                                                      |
| mongodb  | MongoDB datastore. This datastore implementation holds items in an external MongoDB instance.                                                                                                                                       |
| nedb     | NeDB datastore. This datastore implementation holds items in an external nedb database.                                                                                                                                             |

## Configuration

Configuration can be set using the `DATASTORE_IMPL` environment variable in backend, which accepts one of `inmem`, `mongodb` as values.

    DATASTORE_IMPL=inmem

## Datastore implementations

### In-memory implementation

The in-memory implementation is the default, and requires no additional configuration. Because it is in-memory, it does not share data between multiple instances of the application.

This datastore implementation holds all items in memory for the lifetime of the process. There is no eviction, so growth is infinite with continued insertions. Do not use this in production.

The following environment variables apply:

    DATASTORE_IMPL=inmem

### Local file database implementation

The Local DB implementation uses an external file to store data. It is a lightweight, embedded database.
It is a good option for local use, but not recommended for production use.

The following environment variables apply:

    DATASTORE_IMPL=localdb
    DATASTORE_PATH=/path/to/code-metrics.db

Leaving the `DATASTORE_PATH` blank will use an in-memory version of the DB.

### DynamoDB implementation

The DynamoDB implementation uses an external DynamoDB instance to store data. It requires valid AWS credentials and permissions.

The following environment variables apply:

    DATASTORE_IMPL=dynamodb
    DATABASE_NAME=CodeMetrics
    AWS_REGION=us-east-1

Ensure the CodeMetrics backend has the necessary AWS permissions (e.g. using IAM or AWS configuration files) to read (and optionally create) the relevant tables.

The IAM permissions required are:

```
dynamodb:CreateTable
dynamodb:DeleteItem
dynamodb:DescribeTable
dynamodb:DescribeTimeToLive
dynamodb:GetItem
dynamodb:PutItem
dynamodb:Scan
dynamodb:UpdateTimeToLive
```

<details>
<summary>Example IAM policy document</summary>

This example IAM policy scopes access to tables with names in the format `CodeMetrics_*`, but you can be a specific as required by your environment.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Stmt1688577177960",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:UpdateTimeToLive"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:us-east-1:000000000000:table/CodeMetrics_*"
    }
  ]
}
```

</details>

### MongoDB implementation

The MongoDB implementation uses an external MongoDB instance to store data. It requires configuration of the connection and authentication details for the MongoDB server.

The following environment variables apply:

    DATASTORE_IMPL=inmem
    DATABASE_NAME=code-metrics
    DATABASE_URI=mongodb://code-metrics:changeme@localhost:27017

---

## Caching

Certain metrics can be cached in the datastore, for rapid subsequent retrieval and reduction of API calls to the external data providers.

The cache is enabled by this environment variable:

    LOOKUP_CACHE_ENABLED=true

Other, more specific cache settings are as follows:

| Name                     | Details                                          | Default |
| ------------------------ | ------------------------------------------------ | ------- |
| CACHE_REPO_LIST          | Cache the VCS repository names.                  | `true`  |
| PRECACHE_REPO_LIST       | Pre-cache the VCS repository names at startup.   | `true`  |
| CACHE_PIPELINE_BUILDS    | Cache the pipeline build metadata.               | `true`  |
| EXPIRY_SECONDS           | Time to cache data if it is for the current day. | `3600`  |
| REPO_LIST_EXPIRY_SECONDS | Time to cache the VCS repository names.          | `21600` |
