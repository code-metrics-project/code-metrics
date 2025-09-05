# Deployment with Docker

This method uses [Docker Compose](https://docs.docker.com/compose/install/).

> **Note**
> If you are deploying using Kubernetes, see the [Helm deployment guide](./helm.md).

## Steps

To start, clone the repository then run:

    docker compose -f compose/docker-compose.yaml --project-directory . up --build

> Note: if you want to run with mocked backend services, amend the Compose command as follows:
> ```
> docker compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml --project-directory . up --build 
> ```

Access:

- Access the web UI at http://localhost:3001
- The API runs at http://localhost:3000

> **Note**
> To change the config path, set the `CONFIG_DIR` environment variable.
>
> For example:
> ```
> CONFIG_DIR=/path/to/config/files docker compose compose/docker-compose.yaml --build --project-directory . up
> ```
