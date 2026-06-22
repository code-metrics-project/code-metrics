# code-metrics backend

This app is developed to help with the integration and mapping of data between various SDLC systems for code management, code quality and project management delivey. Please read the [Docs](../docs/README.md) on the relevant features and setup required to get the platform up and running and ready for use.

## Before you start

1. Set up access to the remote systems such as ADO, Jira, SonarQube etc. by defining the required configuration JSON files using the [Configuration instructions](../docs/configuration.md).
2. Run `npm ci` to install dependencies using the exact versions set within `package-lock.json`.

## Run

To start the backend nodejs application locally, run `npm run dev`.

### Configuration loading mode

Configuration lazy loading is enabled by default.

- Set `LAZY_LOAD_CONFIG_DISABLED=true` to disable lazy loading and force eager startup loading.
- `CONFIG_CACHE_TTL_MS` controls refresh cadence only when lazy loading is enabled.
- The bootstrap API (`/api/system/bootstrap`) returns `configCacheTtlMs=0` when lazy loading is disabled.

When querying the various APIs to other systems, it can take a minute if JIRA or ADO for example are responding slowly; or if you've run a query that returns a very large number of results. It's recommended to test your queries on the relevant systems in the browser first (such as executing JQL in JIRA) to check you're getting the results you expect. In almost all cases you will want to time limit it (e.g. last 30 days).

## Test

Run unit tests with:

    npm test

or:

    npm run test:unit

### Integration tests

To run integration tests, first ensure you have installed the [Imposter CLI](https://imposter.sh).

Then execute the tests with:

    npm run test:integration

### Slow tests

Some tests are long-running, such as the prediction tests.

To run slow tests, execute:

    npm run test:slow

## Adapting the code

The `src/definitions` folder is where the main magic happens for handling the orchestration of calls to data sources then combining and transforming the results.
