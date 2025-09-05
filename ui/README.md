# code-metrics frontend

This app is developed to help with easily relating JIRA information to ADO PRs so that we can get code related metrics based on JIRA tickets.

## Before you start

1. Follow the steps in the `backend` module.
2. Run `npm ci` to install dependencies.

## Run

To start the web UI run `npm run serve`.

## Testing

Various test frameworks have been added to the project to provide unit and UI testing capability during development.

### Unit Tests

Jest is used to execute unit testing.

1. Run `npm run test:unit` to execute unit tests.
2. Run `npm run test:cov` to execute unit tests with overall coverage reporting.

### UI Tests

cypress is used to execute UI testing.

1. Run `npm run test:e2e` to load the cypress UI application to perform tests in your browser of choice manually.
2. Run `npm run test:e2e:headless` to execute all cypress tests in headless mode - this is used also within the CI pipeline.

## Documentation

[Read the main applicaton documentation](../docs/README.md).
