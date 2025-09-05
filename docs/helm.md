# Deployment on Kubernetes using Helm

Code Metrics can be deployed on Kubernetes. To ease deployment, the project provides a Helm chart.

## Structure

There are 4 charts:

1. code-metrics-api
2. code-metrics-ui
3. code-metrics
4. mongodb

The chart code-metrics is an umbrella chart to deploy and configure the API and UI as a 
single deployment, as in 90% of cases they would be deployed together. The inclusion of the 
API and UI as sub-charts is to enable individual deployments where required.

## MongoDB

The implementation of mongo contained in this chart is very basic, unoptimised and not secured for production use. It is intended for development and demo purposes. Please deploy a database separately for production usage.

> **Limitations**
> 
> 1. Template naming is not very clear. e.g. for deployments of `<release-name>-component`.
> 2. Backend readiness healthcheck is the same as the liveness check.

## Deploying on Rancher Desktop

In Rancher Desktop, the UI being 'local' and the backend being remote requires some extra steps.

Once the front-end is deployed with a URL such as `code-metrics.127.0.0.1.sslip.io` the backend should be port forwarded to localhost on port 3000.

This will allow the UI to talk to the API. In a production deployment the API would have an `Ingress` that would be used for this purpose but due to DNS and local routing this workaround is required.

Alternatively, editing `/etc/hosts` with the name and IP may work as a temporary approach, but is not preferred.

## Deploying with a separate database

When deploying MongoDB as a backing data store, see: [MongoDB Community Kubernetes Operator
](https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/README.md) documentation.
---

## Running periodic cache updates in Kubernetes

You can run periodic cache updates in Kubernetes. See [Trigger a cache refresh](./system_admin.md) for more information.
