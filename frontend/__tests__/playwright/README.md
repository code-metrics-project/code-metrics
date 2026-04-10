# Playwright E2E Tests for CodeMetrics UI

This directory contains the Playwright E2E test suite for the CodeMetrics React UI. These tests mirror the functionality of the Cypress tests and provide an alternative E2E testing solution using Playwright.

## Structure

```
__tests__/playwright/
├── fixtures.ts           # Test fixtures and helpers (equivalent to Cypress commands)
├── coverage.ts           # Coverage collection utilities
├── global-setup.ts       # Global setup for test runs
├── global-teardown.ts    # Global teardown and coverage report generation
├── fixtures/             # Test fixtures (SARIF files, etc.)
│   ├── example.sarif
│   └── example-comprehensive.sarif
└── specs/
    ├── oidc/             # OIDC authentication tests
    │   ├── keycloak-login.spec.ts
    │   └── oidc-login.spec.ts
    ├── regression/       # Regression test suite
    │   ├── app-load.spec.ts
    │   ├── app-unavailable.spec.ts
    │   ├── dependency-alerts.spec.ts
    │   ├── quality-gates.spec.ts
    │   ├── query.spec.ts
    │   ├── repositories.spec.ts
    │   ├── save-query.spec.ts
    │   ├── vulnerabilities.spec.ts
    │   └── workload.spec.ts
    └── smoke/            # Smoke test suite
        └── auth.spec.ts
```

## Available Scripts

| Script                      | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `bun run test:e2e:install`  | Install Playwright browser binaries                      |
| `bun run test:e2e:dev`      | Open Playwright UI mode for interactive testing          |
| `bun run test:e2e:run`      | Run all Playwright tests for the Chromium project        |
| `bun run test:e2e`          | Run regression tests only                                |
| `bun run test:e2e:coverage` | Run regression tests with coverage collection            |
| `bun run test:e2e:headless` | Run regression tests in headless mode with list reporter |
| `bun run test:e2e:keycloak` | Run Keycloak OIDC login tests                            |
| `bun run test:e2e:keycloak:coverage` | Run Keycloak OIDC login tests with coverage collection |
| `bun run test:e2e:oidc`     | Run OIDC mock login tests                                |
| `bun run test:e2e:oidc:coverage` | Run OIDC mock login tests with coverage collection     |
| `bun run test:e2e:smoke`    | Run smoke tests                                          |
| `bun run test:e2e:all`      | Run all tests                                            |
| `bun run test:e2e:report`   | Open the HTML test report                                |

## Prerequisites

1. Install dependencies:

   ```bash
   bun install
   ```

2. Install Playwright browsers:

   ```bash
   bun run test:e2e:install
   ```

3. Ensure the backend API is running (or mocks are configured).

## Running Tests

### Quick Start

```bash
# Run all regression tests (starts dev server automatically)
bun run test:e2e

# Open interactive UI mode
bun run test:e2e:dev
```

### With Coverage

```bash
# Run tests with coverage collection
bun run test:e2e:coverage
```

Coverage reports are generated in a profile-specific folder:

- `coverage-frontend--e2e/` for regression e2e runs
- `coverage-frontend--oidc/` for OIDC runs
- `coverage-frontend--keycloak/` for Keycloak runs

### OIDC/Keycloak Tests

For OIDC tests, you need the respective authentication server running:

```bash
# For Keycloak (assumes Keycloak at localhost:8086)
bun run test:e2e:keycloak

# For OIDC mock (assumes mock at localhost:8080)
bun run test:e2e:oidc
```

## Test Fixtures

The test suite includes a `TestHelpers` class that provides custom helper methods equivalent to Cypress custom commands:

- `login()` - Log in with admin credentials
- `checkFooter()` - Verify footer content
- `selectQuery(queryTitle)` - Select a query type
- `selectWorkloads(workloads)` - Select one or more workloads
- `selectJobGroup(jobGroup)` - Select a job group filter
- `selectRepoGroup(repoGroup)` - Select a repo group filter
- `chartVisible(visible)` - Assert chart visibility

## Configuration

The Playwright configuration is defined in `playwright.config.ts` at the project root. Key settings:

- **Base URL**: `http://code-metrics.localhost:3001`
- **Browser**: Chromium (single browser for faster runs)
- **Web Server**: Automatically starts the dev server before tests
- **Screenshots**: Captured on failure
- **Video**: Recorded on first retry
- **Traces**: Collected on first retry

## Coverage Collection

When running with `COVERAGE_ENABLED=true`:

1. The Vite dev server instruments the code with Istanbul
2. After each test, coverage data is extracted from the browser
3. Coverage files are stored in `.nyc_output_playwright/`
4. On test completion, NYC generates reports in the profile-specific folder (`coverage-frontend--e2e/`, `coverage-frontend--oidc/`, or `coverage-frontend--keycloak/`)
