# Getting started

You can run Code Metrics in a number of ways:

- [Docker or Docker Compose](./deployment_docker.md)
- [AWS Lambda](./deployment_lambda.md)
- [Kubernetes](./helm.md)
- [Using Node.js directly](./run_local_node.md)

Once you have chosen an approach, continue to the [configuration guide](./configuration.md). 

---

## Docker Compose

This method uses [Docker Compose](https://docs.docker.com/compose/install/).

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

## AWS Lambda

Code Metrics can be deployed to AWS Lambda.

See the [AWS Lambda deployment instructions](./deployment_lambda.md).

## Kubernetes

The Code Metrics Docker containers can also be run on Kubernetes.  

See the [instructions for using Helm](./helm.md).

## Using Node.js directly

See the [Node.js deployment instructions](./run_local_node.md).

## Desktop Application
Code Metrics can be run as a localised application on your desktop. This allows you to run the tool without needing to set up a server or use a web browser.

See the [desktop application instructions](./desktop.md).


## Next steps

Learn [how to configure Code Metrics](./configuration.md) for your team.
