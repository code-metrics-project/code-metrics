# Manual MongoDB collection setup

By default, CodeMetrics creates MongoDB collections automatically on first access. You can disable this with `DATASTORE_AUTO_CREATE=false` if you prefer to manage collections yourself.

Each collection needs a TTL index on the `expireAt` field. Without it, cached data will never expire and the collection will grow indefinitely.

## Creating collections

You can create a collection with the MongoDB shell (`mongosh`) or the `mongoexport`/`mongo` CLI. The simplest approach is to create it directly:

```bash
mongosh --eval "db.createCollection('vcs-cache')" code-metrics
```

Replace `vcs-cache` with the collection name you need, and `code-metrics` with your database name if it differs from the default. Collection names are used as-is with no prefix. See [datastore collections](datastore_collections.md) for the full list.

## TTL index

Each collection needs a TTL index on the `expireAt` field. This tells MongoDB to delete documents automatically once their `expireAt` value is in the past.

```bash
mongosh --eval "db.vcs-cache.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0, name: 'expiry' })" code-metrics
```

The settings are:

| Setting | Value |
|---|---|
| Field | `expireAt` |
| Index name | `expiry` |
| Direction | Ascending (`1`) |
| `expireAfterSeconds` | `0` |

The `expireAfterSeconds: 0` means documents expire as soon as `expireAt` is in the past. The `expireAt` value is a JavaScript `Date` object set by CodeMetrics when it writes the item.

You can verify the index with:

```bash
mongosh --eval "db.vcs-cache.getIndexes()" code-metrics
```

The output should include an index with `"name": "expiry"` on the `expireAt` field.

## Creating multiple collections

The full list of collections is in [datastore collections](datastore_collections.md). If you need to create them all upfront, you can use a script like this:

```bash
COLLECTIONS=(
  "ado-issues-by-date"
  "alerts"
  "commit-prs"
  # ... add the remaining collections from datastore_collections
)

DB="code-metrics"

for collection in "${COLLECTIONS[@]}"; do
  mongosh --eval "db.createCollection('$collection')" "$DB"
  mongosh --eval "db.$collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0, name: 'expiry' })" "$DB"
done
```

Change `DB` if your `DATABASE_NAME` environment variable is set to something other than the default.

## What happens if a collection is missing the TTL index

CodeMetrics will still write data to the collection. It will log a warning and continue operating. The data just will not expire, so the collection will keep growing.

If the collection does not exist at all and auto-creation is disabled, CodeMetrics will fail with an error naming the missing collection.
