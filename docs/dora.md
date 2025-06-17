# DORA metrics

CodeMetrics can measure the four metrics used in the [DORA State of DevOps Report](https://dora.dev/publications/) and [Accelerate](https://nicolefv.com/writing) that relate to software delivery performance.

The metrics are:

- Deployment frequency
- Lead time for changes
- Time to restore service
- Change failure rate

To calculate DORA metrics you must set up your deployment configuration. See [Deployment configuration](./config_deployments.md) for more information.

## Deployment frequency

Deployment frequency is the number of deployments to production per unit of time. This is a measure of how often you deploy code to production.

![Graph of deployment frequency for 3 job groups over time](img/deployment_frequency.png)

## Lead time for changes

Lead time for changes is the time it takes to go from code committed to code successfully running in production. This is a measure of how quickly you can get code into production.

![Graph of lead time for changes for a workload over time](img/lead_time_for_changes.png)

## Time to restore service

Time to restore service is the time it takes to restore service when a service incident occurs. This is a measure of how quickly you can recover from incidents.

![Graph of time to restore service for a workload over time](img/time_to_restore_service.png)

## Change failure rate

Change failure rate is the percentage of changes that result in degraded service and require remediation. This is a measure of how often your changes cause problems.

![Graph of change failure rate for a workload over time](img/change_failure_rate.png)

## Where to find DORA metrics

DORA metrics must be enabled for your CodeMetrics instance, by setting the environment variable `FEATURE_DORA_METRICS=true`. Once enabled, DORA metrics are available in the Workloads section and each of the four measures can be used in queries.

To view DORA metrics for a workload, navigate to the [Workloads](./workloads.md) section and select the workload you are interested in. Click the `DORA` button to view the DORA metrics for that workload.

To use DORA metrics in queries, navigate to the `Queries` page. Create a new query and select the DORA metric you are interested in from the dropdown list.

See the [Queries section](./queries.md) for further information.
