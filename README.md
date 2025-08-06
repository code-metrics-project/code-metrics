# Code Metrics

[![CI](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/ci.yaml/badge.svg)](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/ci.yaml) [![CD](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/cd.yaml/badge.svg)](https://github.com/DeloitteDigitalUK/code-metrics/actions/workflows/cd.yaml)

![Code Metrics logo](./docs/img/codemetrics_logo_small.png)

---

Code Metrics is a system to help you gain deep insights into the quality of your software products. It draws on metrics about your source code, your CI/CD pipeline and your tickets (such as bugs/defects) and incidents.

At its core, Code Metrics provides a collection of whole project lifecycle code quality analysis tools. It enables you to combine sources to look for correlations, to answer questions over time such as:

- the bug to change ratio (related to change failure rate),
- which files are frequently implicated when bugs are fixed,
- how test coverage correlates to incidents,
- how complexity is changing with codebase size,
- how long pull requests take to review and merge,
- how much churn has there been in the codebase,
- DORA metrics (deployment frequency, change failure rate, time to restore service, lead time for changes), and
- custom combinations you create.

---

## Documentation

[Read the documentation](https://code-metrics-project.github.io/docs/).

## Running Code Metrics

You can run Code Metrics in a number of ways:

- Docker or [Docker Compose](https://code-metrics-project.github.io/docs/getting_started/#docker-compose)
- [Kubernetes](https://code-metrics-project.github.io/docs/getting_started/#kubernetes)
- Running on [AWS Lambda](https://code-metrics-project.github.io/docs/getting_started/#aws-lambda)
- Using [Node.js directly](https://code-metrics-project.github.io/docs/getting_started/#using-nodejs-directly)

## Getting started

The fastest way to get up and running is to use [Docker Compose](https://docs.docker.com/compose/install/).

To start, clone the repository then run:

    docker-compose -f compose/docker-compose.yaml --project-directory . up --build

> Note: if you want to run with mocked backend services, amend the Compose command as follows:
>
> ```
> docker compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml --project-directory . up --build
> ```
>
> or if you want to get _everything_ running with the example instances as well:
>
> ```
> docker compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml -f compose/docker-compose-examples.yaml --project-directory . up --build
> ```

alternatively if you also have `make` installed run:
`make docker-compose` or `make docker-compose-mocks`

Access:

- Access the web UI at http://localhost:3001
- The API runs at http://localhost:3000

> Read the [getting started](https://code-metrics-project.github.io/docs/getting_started/) documentation.

## Releases

See the [Releases page](https://github.com/DeloitteDigitalUK/code-metrics/releases).

## Contributing

We welcome contributions to Code Metrics! If you're interested in contributing, please review the following resources:

- [Developer Documentation](./docs/dev/README.md) - Guide for new and existing contributors
- [Standards and Patterns](./docs/dev/standards_patterns.md) - Our coding standards and architectural patterns
- [Architecture](./docs/architecture.md) - The system architecture and integration points
- [Release Process](./docs/dev/release.md) - How we handle versioning and releases

Before submitting a pull request, please ensure your code follows our standards and that all tests pass.

## Roadmap/project board

See [the project board](https://github.com/DeloitteDigitalUK/code-metrics/projects/1).

# This is a change