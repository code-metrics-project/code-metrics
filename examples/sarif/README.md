# Example SARIF Files

This directory contains example SARIF (Static Analysis Results Interchange Format) files for testing the vulnerability upload feature.

## Files

- `example.sarif` - A minimal SARIF file with a single warning-level finding
- `example-comprehensive.sarif` - A comprehensive SARIF file with multiple security findings across different severity levels (SQL injection, XSS, hardcoded credentials, etc.)

## Usage in E2E Tests

These files are symlinked to `frontend/__tests__/e2e/fixtures/` and used by the E2E tests to verify the vulnerability upload and query functionality. Changes to these files will affect the E2E tests.

## Manual Upload Example

```bash
curl -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer eyJhbGciOiJI...' \
     -d "@example.sarif" \
     "http://localhost:3000/api/security/vulnerabilities?workload=athena&repoName=spring-petclinic&reportDate=2023-12-11"
```
