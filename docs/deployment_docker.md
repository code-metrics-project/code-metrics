# Deployment with Docker

## Introduction

Docker Compose provides a straightforward containerized deployment option for CodeMetrics, ideal for local development, testing, and evaluation. Using containers ensures consistency across different environments while maintaining simplicity through Docker Compose's declarative configuration.

### When to choose Docker Compose

**Best suited for:**

- **Local development**: Run the full stack locally with a single command for development and debugging
- **Testing and evaluation**: Quickly spin up CodeMetrics to test features and evaluate functionality
- **CI/CD environments**: Reproducible testing environments in continuous integration pipelines
- **Small-scale production**: Simple production deployments for small teams without orchestration needs
- **Proof of concept**: Demonstrate CodeMetrics capabilities without complex infrastructure setup
- **Learning environment**: Understand the application architecture with minimal setup overhead

**Consider alternatives if:**

- **Enterprise production deployments**: Use [Kubernetes with Helm](./helm.md) for scalability, high availability, and advanced orchestration
- **Serverless requirements**: Use [AWS Lambda deployment](./deployment_lambda.md) for auto-scaling and pay-per-use pricing
- **Simple evaluation**: Use [Node.js direct deployment](./run_local_node.md) for minimal overhead and fastest setup
- **Multi-environment orchestration**: Kubernetes provides better support for complex multi-environment deployments

### Architecture overview

The Docker Compose deployment includes:

- **API container**: Backend service with all dependencies bundled
- **UI container**: Nginx-based frontend serving static assets
- **MongoDB container**: Database service (optional, can use external database)
- **Mock services** (optional): Simulated external services for testing without real integrations
- **Networking**: Internal Docker network for service communication
- **Volumes**: Persistent storage for database and configuration

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.x or later
- [Docker Compose](https://docs.docker.com/compose/install/) V2 (included with Docker Desktop)
- 4GB+ RAM available for containers
- Sufficient disk space for images and volumes (~2GB)

## Installation

### Basic deployment

1. Download the Docker Compose files from the [Releases page](https://github.com/code-metrics-project/releases/releases):

```bash
# Download the Docker Compose package (set the version to the latest release)
curl -L https://github.com/code-metrics-project/releases/releases/download/2.46.2/codemetrics-docker-compose.zip -o codemetrics-docker-compose.zip

# Extract the files
unzip codemetrics-docker-compose.zip
cd codemetrics-docker-compose
```

2. Start the services:

```bash
docker compose -f compose/docker-compose.yaml --project-directory . up --build
```

3. Access the application:
   - Web UI: `http://localhost:3001`
   - API: `http://localhost:3000`

### With mock services

For testing without external service integrations, use the mock services:

```bash
docker compose -f compose/docker-compose.yaml -f compose/docker-compose-mocks.yaml --project-directory . up --build
```

This starts mock implementations of:

- Code management platforms (GitHub, GitLab, Azure DevOps, Bitbucket)
- Code analysis tools (SonarQube)
- Project management systems (Jira)
- CI/CD pipelines

### Background mode

Run services in the background (detached mode):

```bash
docker compose -f compose/docker-compose.yaml --project-directory . up -d --build
```

View logs:

```bash
# All services
docker compose -f compose/docker-compose.yaml --project-directory . logs -f

# Specific service
docker compose -f compose/docker-compose.yaml --project-directory . logs -f api
```

Stop services:

```bash
docker compose -f compose/docker-compose.yaml --project-directory . down
```

## Configuration

### Environment variables

Set environment variables in the Docker Compose file or via a `.env` file:

```bash
# Create .env file in project root
cat > .env << EOF
DATABASE_URI=mongodb://mongodb:27017/codemetrics
LOG_LEVEL=1
CORS_ORIGIN=http://localhost:3001
AUTHENTICATOR_IMPL=file
EOF
```

### Custom configuration directory

Override the configuration directory path:

```bash
CONFIG_DIR=/path/to/config/files docker compose -f compose/docker-compose.yaml --project-directory . up --build
```

The configuration directory should contain your `workload-config.yaml` and `remote-config.yaml` files. See the [configuration documentation](./configuration.md) for details.

### Using an external database

To use an external MongoDB instance instead of the containerized one:

1. Edit `compose/docker-compose.yaml` to remove or comment out the MongoDB service
2. Set the `DATABASE_URI` environment variable to point to your external database:

```yaml
services:
  api:
    environment:
      - DATABASE_URI=mongodb://external-host:27017/codemetrics
```

### Port configuration

Change default ports by modifying the port mappings:

```yaml
services:
  ui:
    ports:
      - "8080:80" # Change UI port to 8080
  api:
    ports:
      - "8000:3000" # Change API port to 8000
```

### Resource limits

Set resource limits for containers:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 1G
```

---

## Summary

Docker Compose deployment provides a containerized, reproducible environment for CodeMetrics, balancing simplicity with the benefits of containerization. It's ideal for local development, testing, and small-scale production deployments. While it lacks the advanced orchestration features of Kubernetes, it offers a straightforward path to running CodeMetrics in containers without infrastructure complexity.

**Key advantages:**

- Quick setup with single-command deployment
- Consistent environment across development and testing
- Isolated services with container networking
- Easy to version control and share
- No cloud platform dependencies

**Limitations:**

- No built-in high availability or auto-scaling
- Manual management of updates and restarts
- Limited orchestration compared to Kubernetes
- Single-host deployment only

### Next steps

- Configure [environment variables](./env_vars.md) for your deployment
- Set up [authentication](./authentication.md) for secure access
- Configure [integrations](./configuration.md) with your development tools
- For production deployments, consider [Kubernetes with Helm](./helm.md)
- Set up [monitoring and backups](./system_admin.md) for production use

---

## Troubleshooting

### Debugging containers

**Check container status:**

```bash
# List running containers
docker compose -f compose/docker-compose.yaml --project-directory . ps

# View container details
docker inspect <container-name>

# Check container logs
docker compose -f compose/docker-compose.yaml --project-directory . logs api
docker compose -f compose/docker-compose.yaml --project-directory . logs ui

# Follow logs in real-time
docker compose -f compose/docker-compose.yaml --project-directory . logs -f
```

**Enable detailed logging:**

Set environment variables in your `.env` file or docker-compose.yaml:

```yaml
services:
  api:
    environment:
      - LOG_LEVEL=2 # Verbose logging
      - NODE_OPTIONS=--enable-source-maps # Proper stack traces with line numbers
```

### Common issues

#### Containers fail to start

**Symptom**: Services exit immediately or show error status

**Solutions:**

```bash
# Check logs for errors
docker compose -f compose/docker-compose.yaml --project-directory . logs

# Rebuild images
docker compose -f compose/docker-compose.yaml --project-directory . build --no-cache

# Remove old containers and volumes
docker compose -f compose/docker-compose.yaml --project-directory . down -v
docker compose -f compose/docker-compose.yaml --project-directory . up --build
```

Common causes:

- Port conflicts (3000 or 3001 already in use)
- Insufficient memory or disk space
- Invalid configuration files

#### Port already in use

**Symptom**: "bind: address already in use" error

**Solutions:**

```bash
# Find process using the port (macOS/Linux)
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yaml
services:
  api:
    ports:
      - "3002:3000"  # Use different host port
```

#### Cannot connect to API from UI

**Symptom**: UI shows connection errors or "Cannot reach API"

**Solutions:**

- Verify both containers are running: `docker compose ps`
- Check container networking:

```bash
docker network ls
docker network inspect code-metrics_default
```

- Ensure `CORS_ORIGIN` environment variable is set correctly in API service
- Check API health endpoint: `curl http://localhost:3000/health`

#### Database connection failures

**Symptom**: API logs show MongoDB connection errors

**Solutions:**

```bash
# Check if MongoDB container is running
docker compose -f compose/docker-compose.yaml --project-directory . ps mongodb

# Check MongoDB logs
docker compose -f compose/docker-compose.yaml --project-directory . logs mongodb

# Verify connection from API container
docker compose -f compose/docker-compose.yaml --project-directory . exec api sh
# Inside container:
nc -zv mongodb 27017
```

For external databases:

- Verify `DATABASE_URI` is correct
- Ensure network connectivity from containers
- Check database credentials and permissions

#### Out of memory errors

**Symptom**: Containers crash or show "out of memory" errors

**Solutions:**

```bash
# Check Docker resource limits
docker stats

# Increase Docker Desktop memory allocation (Settings > Resources)
# Or set limits per service in docker-compose.yaml
```

For Docker Desktop:

- macOS/Windows: Increase memory in Settings > Resources > Advanced
- Linux: Ensure host has sufficient memory

#### Volume/permission issues

**Symptom**: Configuration not loading or permission errors

**Solutions:**

```bash
# Check volume mounts
docker compose -f compose/docker-compose.yaml --project-directory . config

# Fix file permissions
chmod -R 755 ./config
chmod -R 755 ./data

# On Linux with SELinux, add :z flag to volumes
volumes:
  - ./config:/app/config:z
```

#### Network connectivity issues

**Symptom**: Containers cannot communicate with each other

**Solutions:**

```bash
# Inspect Docker network
docker network inspect code-metrics_default

# Test connectivity between containers
docker compose -f compose/docker-compose.yaml --project-directory . exec api ping ui
docker compose -f compose/docker-compose.yaml --project-directory . exec ui ping api

# Recreate network
docker compose -f compose/docker-compose.yaml --project-directory . down
docker compose -f compose/docker-compose.yaml --project-directory . up
```

### Performance optimisation

**Monitor container resources:**

```bash
# Real-time stats
docker stats

# Check container resource usage
docker compose -f compose/docker-compose.yaml --project-directory . stats
```

**Optimisation tips:**

1. **Resource limits**: Set appropriate CPU and memory limits
2. **Volume performance**: Use named volumes instead of bind mounts for better performance
3. **Prune regularly**: Remove unused images and containers

```bash
docker system prune -a --volumes
```

### Maintenance commands

**Update to newer version:**

```bash
# Download the new version
curl -L https://github.com/code-metrics-project/releases/releases/download/<VERSION>/codemetrics-docker-compose.zip -o codemetrics-docker-compose-new.zip

# Extract to a new location or backup existing deployment
unzip codemetrics-docker-compose-new.zip -d codemetrics-docker-compose-new

# Navigate to directory
cd codemetrics-docker-compose-new

# Rebuild and restart
docker compose -f compose/docker-compose.yaml --project-directory . up -d --build

# Or force recreation
docker compose -f compose/docker-compose.yaml --project-directory . up -d --force-recreate --build
```

**Backup data:**

```bash
# Backup MongoDB data
docker compose -f compose/docker-compose.yaml --project-directory . exec mongodb mongodump --out /data/backup

# Copy from container
docker cp $(docker compose -f compose/docker-compose.yaml --project-directory . ps -q mongodb):/data/backup ./backup
```

**Reset environment:**

```bash
# Stop and remove everything
docker compose -f compose/docker-compose.yaml --project-directory . down -v

# Remove images
docker compose -f compose/docker-compose.yaml --project-directory . down --rmi all

# Clean start
docker compose -f compose/docker-compose.yaml --project-directory . up --build
```

### Getting help

If issues persist:

1. Enable debug logging: Set `LOG_LEVEL=2` and `NODE_OPTIONS=--enable-source-maps`
2. Check logs for all services: `docker compose logs`
3. Verify Docker and Docker Compose versions
4. Review the [configuration documentation](./configuration.md)
5. Check [Docker documentation](https://docs.docker.com/)
6. Join the [CodeMetrics community](https://github.com/code-metrics-project) for support
