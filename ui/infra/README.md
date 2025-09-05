# CodeMetrics UI static web deployment

## Build

```bash
npm run build
```

Set `apiBaseUrl` in `dist/config.json` to the API base URL.

## Deploy

Deploy bucket and CloudFront distribution:

```bash
sam deploy
```

Deploy static web assets:

```bash
aws s3 sync dist/ s3://<bucket-name>/
```
