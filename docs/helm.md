# Deployment on Kubernetes using Helm

## Introduction

Kubernetes provides a robust, scalable platform for deploying CodeMetrics in containerized environments. Using Helm charts simplifies the deployment and configuration management, making it suitable for teams running production workloads in cloud or on-premises Kubernetes clusters.

### When to choose Kubernetes

**Best suited for:**

- **Enterprise environments**: Organisations with existing Kubernetes infrastructure and DevOps expertise
- **High availability requirements**: Built-in support for pod replication, load balancing, and self-healing
- **Multi-environment deployments**: Easily replicate deployments across dev, staging, and production clusters
- **Scalability**: Horizontal pod autoscaling handles varying loads automatically
- **Platform independence**: Run on any Kubernetes distribution (EKS, AKS, GKE, OpenShift, on-premise)
- **Advanced orchestration**: Integration with service meshes, observability tools, and GitOps workflows

**Consider alternatives if:**

- **Limited Kubernetes expertise**: Steep learning curve for teams new to container orchestration
- **Small-scale deployments**: Overhead of maintaining Kubernetes may outweigh benefits for simple use cases
- **Quick prototyping**: Docker Compose or Node.js deployment offers faster initial setup
- **Resource constraints**: Kubernetes control plane requires dedicated infrastructure

### Architecture overview

The Helm chart deploys:

- **API pods**: Scalable backend instances running in containers
- **UI pods**: Nginx-based static file serving for the frontend
- **MongoDB**: Optional basic database (not recommended for production)
- **Ingress**: Configurable routing for external access
- **Services**: Internal networking and load balancing
- **ConfigMaps/Secrets**: Configuration and credential management

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

The implementation of mongo contained in this chart is very basic, unoptimised and not secured for production use. It is intended for development and demo purposes only.

> **⚠️ Production Warning**
>
> The included MongoDB chart lacks:
>
> - Persistent volume configuration
> - Replication and high availability
> - Authentication and security hardening
> - Backup and disaster recovery
> - Performance tuning
>
> **For production deployments, consider:**
>
> - [MongoDB Community Kubernetes Operator](https://github.com/mongodb/mongodb-kubernetes-operator)
> - Managed services (MongoDB Atlas, AWS DocumentDB, Azure Cosmos DB)
> - An external MongoDB cluster

## Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.x installed
- `kubectl` configured with cluster access
- Storage provisioner for persistent volumes (if using external MongoDB)
- Ingress controller (nginx, traefik, etc.) if exposing services externally

## Installation

### Basic deployment

1. Download the Helm chart from the [Releases page](https://github.com/code-metrics-project/releases/releases):

```bash
# Download the chart (replace version with desired release)
curl -L https://github.com/code-metrics-project/releases/releases/download/2.46.2/helm-code-metrics-2.46.2.tgz -o helm-code-metrics.tgz
```

2. Install the chart:

```bash
helm install my-code-metrics helm-code-metrics.tgz
```

### Custom configuration

Create a `values.yaml` file to customise the deployment:

```yaml
code-metrics-api:
  application:
    replicaCount: 3
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
    envVars:
      keyValues:
        DATABASE_URI: "mongodb://external-mongo:27017/codemetrics"
        LOG_LEVEL: "1"
        CORS_ORIGIN: "https://code-metrics.example.com"
        AUTHENTICATOR_IMPL: "oidc"

code-metrics-ui:
  application:
    replicaCount: 2
    envVars:
      keyValues:
        API_BASE_URL: "https://code-metrics-api.example.com"
  ingress:
    enabled: true
    hosts:
      - host: code-metrics.example.com
        paths:
          - path: /
            pathType: ImplementationSpecific

mongodb:
  enabled: false # Use external database
```

Deploy with custom values:

```bash
helm install my-code-metrics helm-code-metrics.tgz -f values.yaml
```

### Individual component deployment

The umbrella chart includes both API and UI as sub-charts. To deploy only one component, disable the other in your `values.yaml`:

**API only:**

```yaml
code-metrics-ui:
  enabled: false

code-metrics-api:
  enabled: true
  # ... API configuration
```

**UI only:**

```yaml
code-metrics-api:
  enabled: false

code-metrics-ui:
  enabled: true
  # ... UI configuration
```

Then deploy:

```bash
helm install my-code-metrics helm-code-metrics.tgz -f values.yaml
```

## Configuration

### Environment variables

Configure the API through environment variables in your `values.yaml`:

```yaml
code-metrics-api:
  application:
    envVars:
      keyValues:
        DATABASE_URI: "mongodb://external-mongo:27017/codemetrics"
        AUTHENTICATOR_IMPL: "oidc"
        OIDC_ISSUER_URL: "https://auth.example.com"
        LOG_LEVEL: "1"
        CORS_ORIGIN: "https://code-metrics.example.com"
```

For sensitive values, use secrets:

```yaml
code-metrics-api:
  application:
    envVars:
      secrets:
        DATABASE_URI:
          name: mongodb-credentials
          key: connection-string
      keyValues:
        LOG_LEVEL: "1"
```

See the [environment variables documentation](./env_vars.md) for all available options.

### Ingress configuration

Expose the UI and API externally:

```yaml
code-metrics-ui:
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - host: code-metrics.example.com
        paths:
          - path: /
            pathType: ImplementationSpecific
    tls:
      - secretName: code-metrics-tls
        hosts:
          - code-metrics.example.com

code-metrics-api:
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: code-metrics-api.example.com
        paths:
          - path: /
            pathType: ImplementationSpecific
```

### Resource management

Set appropriate resource requests and limits:

```yaml
code-metrics-api:
  application:
    resources:
      requests:
        memory: "512Mi" # Minimum guaranteed
        cpu: "250m"
      limits:
        memory: "2Gi" # Maximum allowed
        cpu: "1000m"
```

### Autoscaling

Enable horizontal pod autoscaling:

```yaml
code-metrics-api:
  application:
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
      targetCPUUtilizationPercentage: 70
      targetMemoryUtilizationPercentage: 80
```

## Deploying on Rancher Desktop

Rancher Desktop provides a local Kubernetes environment for development and testing.

### Setup steps

1. Install [Rancher Desktop](https://rancherdesktop.io/) and enable Kubernetes
2. Download and deploy CodeMetrics:

```bash
# Download the chart
curl -LO https://github.com/code-metrics-project/releases/releases/download/2.46.2/helm-code-metrics-2.46.2.tgz

# Install
helm install code-metrics helm-code-metrics-2.46.2.tgz
```

3. Port forward the backend API:

```bash
kubectl port-forward service/code-metrics-api 3000:3000
```

4. Access the UI at the configured Ingress URL (e.g., `code-metrics.127.0.0.1.sslip.io`)

### Network configuration

The UI needs to communicate with the API. For Rancher Desktop, you have two approaches:

**Option 1: Port forwarding (recommended for development)**

```bash
kubectl port-forward service/code-metrics-api 3000:3000
```

Configure the UI to use localhost in your `values.yaml`:

```yaml
code-metrics-ui:
  application:
    envVars:
      keyValues:
        API_BASE_URL: "http://localhost:3000"
```

**Option 2: Ingress for both UI and API**

Configure Ingress for both services:

```yaml
code-metrics-ui:
  ingress:
    enabled: true
    hosts:
      - host: code-metrics.127.0.0.1.sslip.io
        paths:
          - path: /
            pathType: ImplementationSpecific

code-metrics-api:
  application:
    envVars:
      keyValues:
        CORS_ORIGIN: "http://code-metrics.127.0.0.1.sslip.io"
  ingress:
    enabled: true
    hosts:
      - host: code-metrics-api.127.0.0.1.sslip.io
        paths:
          - path: /
            pathType: ImplementationSpecific
```

Then set the API URL in the UI configuration:

```yaml
code-metrics-ui:
  application:
    envVars:
      keyValues:
        API_BASE_URL: "http://code-metrics-api.127.0.0.1.sslip.io"
```

### Production considerations

For production deployments, configure proper Ingress resources so both UI and API are accessible via DNS with TLS termination.

## Deploying with a separate database

Production deployments should use a properly configured external database.

### Disable included MongoDB

```yaml
mongodb:
  enabled: false
```

### Option 1: MongoDB Community Kubernetes Operator

Install the operator:

```bash
kubectl apply -f https://raw.githubusercontent.com/mongodb/mongodb-kubernetes-operator/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml
kubectl apply -f https://raw.githubusercontent.com/mongodb/mongodb-kubernetes-operator/master/config/manager/manager.yaml
```

Deploy a MongoDB replica set:

```yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: code-metrics-mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "6.0.5"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            resources:
              requests:
                storage: 10Gi
```

See the [MongoDB Community Kubernetes Operator documentation](https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/README.md) for detailed configuration.

### Option 2: Managed database services

Configure CodeMetrics to use managed services:

- **MongoDB Atlas**: Cloud-hosted MongoDB with automatic backups
- **AWS DocumentDB**: AWS-managed MongoDB-compatible service
- **Azure Cosmos DB**: Azure's multi-model database with MongoDB API

Example connection configuration:

```yaml
code-metrics-api:
  application:
    envVars:
      secrets:
        DATABASE_URI:
          name: database-credentials
          key: connection-uri
```

Create the secret:

```bash
kubectl create secret generic database-credentials \
  --from-literal=connection-uri='mongodb+srv://user:pass@cluster.mongodb.net/codemetrics'
```

---

## Running periodic cache updates in Kubernetes

You can run periodic cache updates in Kubernetes using CronJobs. See [Trigger a cache refresh](./system_admin.md) for more information.

Example CronJob configuration:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: code-metrics-cache-refresh
spec:
  schedule: "0 */6 * * *" # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cache-refresh
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - curl -X POST http://code-metrics-api:3000/api/admin/cache/refresh
          restartPolicy: OnFailure
```

---

## Summary

Kubernetes deployment with Helm provides enterprise-grade orchestration for CodeMetrics, offering scalability, high availability, and operational flexibility. While it requires Kubernetes expertise and infrastructure, it delivers robust production capabilities for teams with demanding requirements. The Helm charts simplify deployment and configuration, though production deployments require careful attention to database configuration, resource management, and security.

### Next steps

- Configure [environment variables](./env_vars.md) for your deployment
- Set up [authentication](./authentication.md) for secure access
- Configure [integrations](./configuration.md) with your development tools
- Implement [monitoring and observability](./system_admin.md)
- Set up [periodic cache updates](./system_admin.md) for optimal performance

---

## Troubleshooting

### Debugging pod issues

**Check pod status:**

```bash
# List all CodeMetrics pods
kubectl get pods -l app.kubernetes.io/instance=my-code-metrics

# View pod details
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>

# Follow logs in real-time
kubectl logs -f <pod-name>
```

**Enable detailed logging and source maps:**

Configure in your `values.yaml` for better error diagnostics:

```yaml
code-metrics-api:
  application:
    envVars:
      keyValues:
        LOG_LEVEL: "2" # Verbose logging for debugging
        NODE_OPTIONS: "--enable-source-maps" # Enables proper stack traces with line numbers
```

This provides detailed logs and accurate stack traces that map to the original source code, making it easier to identify and fix issues.

### Common issues

#### Pods in CrashLoopBackOff

**Symptom**: Pods continuously restart

**Solutions**:

```bash
# Check pod logs for errors
kubectl logs <pod-name> --previous
```

Common causes:

1. Database connection failure - verify DATABASE_URI
2. Missing required environment variables
3. Insufficient memory - check resource limits
4. Invalid configuration - review values.yaml

#### ImagePullBackOff errors

**Symptom**: Cannot pull container images

**Solutions**:

```bash
# Check image pull secrets
kubectl get secrets

# Verify image name and tag in values.yaml
# For private registries, create image pull secret:
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password>
```

#### Service connectivity issues

**Symptom**: UI cannot connect to API

**Solutions**:

```bash
# Verify services are running
kubectl get svc

# Test API connectivity from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never \
  -- curl http://code-metrics-api:3000/api/health/readiness

# Check service endpoints
kubectl get endpoints

# Verify network policies aren't blocking traffic
kubectl get networkpolicies
```

#### Database connection failures

**Symptom**: API logs show MongoDB connection errors

**Solutions**:

- Verify `DATABASE_URI` environment variable is correct
- Check MongoDB pod is running: `kubectl get pods -l app=mongodb`
- Test database connectivity:

```bash
kubectl run -it --rm mongo-test --image=mongo --restart=Never \
  -- mongosh <connection-string>
```

- For external databases, verify network policies and security groups
- Check if database credentials are correctly stored in secrets

#### Ingress not working

**Symptom**: Cannot access application via domain name

**Solutions**:

```bash
# Verify Ingress controller is installed
kubectl get pods -n ingress-nginx

# Check Ingress resource
kubectl get ingress
kubectl describe ingress <ingress-name>

# Verify DNS points to Ingress LoadBalancer IP
kubectl get svc -n ingress-nginx

# Check Ingress controller logs
kubectl logs -n ingress-nginx <controller-pod>
```

Common Ingress issues:

- Missing or incorrect `ingressClassName`
- TLS certificate not provisioned (check cert-manager logs)
- DNS not pointed to LoadBalancer IP
- Ingress annotations incompatible with controller version

#### Resource quota exceeded

**Symptom**: Pods stuck in Pending state

**Solutions**:

```bash
# Check resource quotas
kubectl get resourcequota

# View node resources
kubectl top nodes

# Check pod resource requests
kubectl describe pod <pod-name> | grep -A 5 "Requests"

# Reduce resource requests in values.yaml or add nodes to cluster
```

#### ConfigMap/Secret not found

**Symptom**: Pods fail to start with missing volume errors

**Solutions**:

```bash
# List ConfigMaps and Secrets
kubectl get configmaps
kubectl get secrets

# Verify referenced names match in values.yaml
# Recreate missing resources or correct references
```

### Performance optimisation

**Monitor resource usage:**

```bash
# Install metrics-server if not present
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View resource usage
kubectl top pods
kubectl top nodes
```

**Optimisation strategies:**

- **Enable horizontal pod autoscaling** for automatic scaling based on load
- **Set appropriate resource requests/limits** to prevent resource contention
- **Use node affinity** to schedule pods on appropriate node types
- **Implement pod disruption budgets** for high availability during updates
- **Configure readiness probes** to prevent routing to unhealthy pods
- **Use persistent volumes** for database with appropriate storage classes

### Upgrading

**Download the new version:**

```bash
# Download the latest chart from the releases page
curl -L https://github.com/code-metrics-project/releases/releases/download/<VERSION>/helm-code-metrics-<VERSION>.tgz -o helm-code-metrics-new.tgz

# Example for version 2.46.3
curl -L https://github.com/code-metrics-project/releases/releases/download/2.46.3/helm-code-metrics-2.46.3.tgz -o helm-code-metrics-2.46.3.tgz
```

**Upgrade release:**

```bash
# Optional - review changes (requires helm-diff plugin)
helm diff upgrade my-code-metrics helm-code-metrics-2.46.3.tgz -f values.yaml

# Perform upgrade
helm upgrade my-code-metrics helm-code-metrics-2.46.3.tgz -f values.yaml

# Rollback if needed
helm rollback my-code-metrics
```

### Uninstalling

```bash
# Delete release
helm uninstall my-code-metrics

# Verify cleanup
kubectl get all -l app.kubernetes.io/instance=my-code-metrics

# Manually delete PVCs if needed (data will be lost)
kubectl delete pvc -l app.kubernetes.io/instance=my-code-metrics
```

### Getting help

If issues persist:

1. Enable debug logging: Set `LOG_LEVEL=2` in API environment variables
2. Check Kubernetes events: `kubectl get events --sort-by='.lastTimestamp'`
3. Review pod logs with increased verbosity
4. Consult the [configuration documentation](./configuration.md)
5. Join the [CodeMetrics community](https://github.com/code-metrics-project) for support

**Best practices:**

- Use external, production-grade databases (not the included MongoDB chart)
- Configure appropriate resource requests and limits
- Implement horizontal pod autoscaling for variable workloads
- Use Ingress with TLS for secure external access
- Monitor resource usage and application metrics
- Implement proper backup and disaster recovery procedures
