# Manual DynamoDB table setup

By default, CodeMetrics creates DynamoDB tables automatically on first access. You can disable this with `DATASTORE_AUTO_CREATE=false` if you prefer to manage tables yourself.

If you take this route, each table needs the same schema and TTL configuration that CodeMetrics would apply automatically. Getting it wrong means the application will fail to read or write data.

## Table schema

Every table uses the same structure:

- **Partition key**: `CacheKey` (String)
- **Billing mode**: `PAY_PER_REQUEST` (on-demand)
- **No sort key, no secondary indexes**

Create a table with the AWS CLI:

```bash
aws dynamodb create-table \
  --table-name CodeMetrics_vcs-cache \
  --attribute-definitions AttributeName=CacheKey,AttributeType=S \
  --key-schema AttributeName=CacheKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Replace `CodeMetrics_vcs-cache` with the actual table name you need. Table names follow the pattern `{DATABASE_NAME}_{collectionName}`. The prefix defaults to `CodeMetrics` unless you set `DATABASE_NAME` to something else. See [datastore collections](datastore_collections.md) for the full list of collection names.

## TTL configuration

CodeMetrics relies on DynamoDB's Time To Live feature to expire cached data. Each table needs TTL enabled on the `expireAt` attribute.

```bash
aws dynamodb update-time-to-live \
  --table-name CodeMetrics_vcs-cache \
  --time-to-live-specification Enabled=true,AttributeName=expireAt
```

The `expireAt` value is a Unix epoch timestamp in seconds. DynamoDB handles the actual deletion of expired items, so you do not need to manage this yourself.

You can verify the setting with:

```bash
aws dynamodb describe-time-to-live --table-name CodeMetrics_vcs-cache
```

The response should show `"TimeToLiveStatus": "ENABLED"`.

## Creating multiple tables

The full list of collections is in [datastore collections](datastore_collections.md). If you need to create them all upfront, you can use a script like this:

```bash
COLLECTIONS=(
  ado-issues-by-date
  alerts
  commit-prs
  # ... add the remaining collections from datastore_collections
)

PREFIX="CodeMetrics"

for collection in "${COLLECTIONS[@]}"; do
  TABLE="${PREFIX}_${collection}"
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=CacheKey,AttributeType=S \
    --key-schema AttributeName=CacheKey,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws dynamodb update-time-to-live \
    --table-name "$TABLE" \
    --time-to-live-specification Enabled=true,AttributeName=expireAt
done
```

Change `PREFIX` if your `DATABASE_NAME` environment variable is set to something other than the default.

## What happens if a table is missing configuration

If a table exists but is missing TTL, CodeMetrics will still write data to it. The data just will not expire, so the table will grow indefinitely.

If the table has the wrong key schema, CodeMetrics will fail with an error when it tries to write. The application logs will show the table name that caused the problem.
