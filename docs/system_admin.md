# System administration tasks

## Trigger a cache refresh

To trigger a cache refresh, you can use the following command:

```bash
curl --request POST --url http://localhost:3000/api/system/cache --header 'Authorization: Bearer TOKEN-HERE' --header 'Content-Type: application/json' --data '{ "operation": "update-cache" }'
```

> **Note**
> Replace `TOKEN-HERE` with a valid API token.

A successful response will return a `202 Accepted` status code.

Log output will look like this:

```
"POST /api/system/cache HTTP/1.1" 202 8 "-" "curl/8.7.1"
Triggering cache refresh
Precaching repositories...
Precaching repository list for athena/athena
Cache hit in vcs-cache for { key: 'mock-azure.athena' }
Precaching repository list for gaia/gaia
Cache hit in vcs-cache for { key: 'mock-github.gaia' }
Precaching repository list for icarus/icarus
Cache hit in vcs-cache for { key: 'mock-azure.icarus' }
Repository precache complete
Cache refresh complete [duration: 3ms]
```

## Running periodic cache updates on AWS Lambda

To run periodic cache updates on AWS Lambda, you can schedule a Lambda function to run at regular intervals.

Set the following environment variables in the Lambda function:

```shell
INVOCATION_MODE=update-cache
```
