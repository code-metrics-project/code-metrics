# Caching

Certain metrics can be cached in the datastore, for rapid subsequent retrieval and reduction of API calls to the external data providers. Caching is especially beneficial when running queries over large numbers of repositories or workloads, as it avoids repeating expensive API calls for data that has not changed.

## How caching works

When a metric is requested, CodeMetrics first checks the datastore for a cached result. If a valid (non-expired) entry exists, it is returned immediately without calling the external provider. If no entry exists, the data is fetched from the source and stored in the datastore for subsequent requests.

Cache entries expire based on configurable TTL (time-to-live) values. Data for the current day uses a shorter TTL than historical data, since today's figures may still be changing.

## Enabling caching

The cache is enabled by this environment variable:

    LOOKUP_CACHE_ENABLED=true

## Configuration

| Name                     | Details                                          | Default |
| ------------------------ | ------------------------------------------------ | ------- |
| CACHE_REPO_LIST          | Cache the VCS repository names.                  | `true`  |
| PRECACHE_REPO_LIST       | Pre-cache the VCS repository names at startup.   | `true`  |
| CACHE_PIPELINE_BUILDS    | Cache the pipeline build metadata.               | `true`  |
| EXPIRY_SECONDS           | Time to cache data if it is for the current day. | `3600`  |
| REPO_LIST_EXPIRY_SECONDS | Time to cache the VCS repository names.          | `21600` |

## What is cached

The following data is cached from external providers:

- Azure DevOps work item metadata
- Branch protection and merge rule metadata from VCS repositories
- Commit history metadata
- Deployment boundary data used for lead time and deployment frequency
- File-level change history metadata
- General VCS data (metadata about commits, pull requests, repository info)
- GitHub Dependency Alert data
- GitHub Issues metadata fetched for bug and incident queries
- Issue metadata used for bug and incident queries
- Known job names across pipeline providers
- Pipeline and deployment event metadata

See [datastore collections](datastore_collections.md) for more information.
