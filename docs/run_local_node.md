# Running using Node.js directly

## Introduction

Running Code Metrics directly with Node.js provides the simplest deployment option, requiring minimal infrastructure and no containerization or cloud platform dependencies. This approach is ideal for quick starts, development environments, or small-scale deployments where operational complexity needs to be minimized.

### When to choose Node.js deployment

**Best suited for:**

- **Quick evaluation**: Get Code Metrics running in minutes to evaluate features and functionality
- **Development environments**: Developers can run locally for testing and debugging without Docker or Kubernetes overhead
- **Learning and experimentation**: Understand Code Metrics internals without abstraction layers
- **Resource-constrained environments**: Minimal overhead—runs on laptops, small VMs etc.
- **Custom integrations**: Direct access to the Node.js process for debugging and customisation

**Consider alternatives if:**

- **Production deployments**: No built-in process management, scaling, or high availability
- **Multiple environments**: Managing separate processes for dev/staging/production becomes cumbersome
- **Team collaboration**: Docker/Kubernetes/AWS Lambda provide better consistency across team members' environments
- **High availability needs**: No automatic restarts, load balancing, or failover capabilities
- **Security requirements**: Lacks containerization isolation and orchestration security features

### Architecture overview

This deployment runs:

- **Backend API**: Single Node.js process serving HTTP requests on port 3000
- **Frontend UI**: Static files served by any web server (built-in Node server, nginx, Apache, etc.)
- **Database**: Requires external MongoDB instance (local or remote)
- **Process management**: Manual or using tools like PM2, systemd, or nodemon

## Prerequisites

- Node.js v20 or later ([download here](https://nodejs.org/))
- MongoDB instance
- Basic command-line familiarity
- Web server for hosting UI (optional: can use Node.js http-server or similar)

## Installation

### Backend API

1. Download the latest release from the [Releases page](https://github.com/code-metrics-project/releases/releases)
2. Extract the `codemetrics-api.zip` file:

```bash
unzip codemetrics-api.zip
cd codemetrics-api
```

3. Configure environment variables:

```bash
# Create .env file or export variables
export DATABASE_URI="mongodb://localhost:27017/codemetrics"
export PORT=3000
export LOG_LEVEL=1
```

See [environment variables](./env_vars.md) for more configuration options.

4. Start the API:

```bash
node index.js
```

> The API runs at http://localhost:3000

**Verify the API is running:**

```bash
curl http://localhost:3000/api/health/readiness
# Expected response: {"status":"ok"}
```

### Frontend UI

1. Download the `codemetrics-ui.zip` file from the [Releases page](https://github.com/code-metrics-project/releases/releases)
2. Extract the archive:

```bash
unzip codemetrics-ui.zip
cd codemetrics-ui
```

3. Configure the API endpoint:

Edit `config.json`:

```json
{
  "apiBaseUrl": "http://localhost:3000"
}
```

4. Serve the static files:

**Option A: Using npx http-server (quick start):**

```bash
npx http-server -p 3001 -c-1
```

**Option B: Using Python's built-in server:**

```bash
python3 -m http.server 3001
```

**Option C: Using nginx:**

```nginx
server {
    listen 3001;
    server_name code-metrics.example.com;
    root /path/to/codemetrics-ui;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Access the UI at `http://localhost:3001`

## Configuration

### Environment variables

Key environment variables for the API:

| Variable        | Description                                      | Default                                 |
| --------------- | ------------------------------------------------ | --------------------------------------- |
| `DATABASE_URI`  | MongoDB connection string                        | `mongodb://localhost:27017/codemetrics` |
| `PORT`          | API server port                                  | `3000`                                  |
| `LOG_LEVEL`     | Logging verbosity (0=error, 1=info, 2=debug)     | `1`                                     |
| `CONFIG_DIR`    | Path to configuration files                      | `./config`                              |
| `AUTH_PROVIDER` | Authentication provider (file, oidc, ldap, etc.) | `file`                                  |

See the [environment variables documentation](./env_vars.md) for comprehensive configuration options.

---

## Summary

Direct Node.js deployment offers the fastest path to running Code Metrics with minimal dependencies and complexity. While it lacks the advanced features of containerised or cloud deployments (automatic scaling, high availability, orchestration), it provides an excellent option for development, evaluation, and small-scale production use. This approach gives you direct access to the application without abstraction layers, making it ideal for learning and customisation.

**Key advantages:**

- Minimal setup complexity
- No Docker or Kubernetes required
- Direct access for debugging and development
- Lowest resource overhead
- Flexible deployment on any platform with Node.js

**Limitations:**

- Manual process management
- No built-in high availability
- Requires separate setup for production features (HTTPS, monitoring, backups)
- Less isolation compared to containers

### Next steps

- Configure [environment variables](./env_vars.md) for your deployment
- Set up [authentication](./authentication.md) for secure access
- Configure [integrations](./configuration.md) with your development tools
- Consider PM2 or systemd for production deployments
- Set up [monitoring and backups](./system_admin.md) for production use

---

## Troubleshooting

### Common issues

#### API fails to start

**Symptom**: Process exits immediately or shows connection errors

**Solutions:**

```bash
# Check Node.js version
node --version  # Must be v20 or later

# Verify MongoDB connection
mongosh $DATABASE_URI

# Check port availability
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Enable debug logging
LOG_LEVEL=2 node index.js
```

Common causes:

- Port 3000 already in use by another process
- MongoDB not running or unreachable
- Invalid `DATABASE_URI` connection string
- Missing required environment variables
- Incorrect Node.js version

#### UI cannot connect to API

**Symptom**: Frontend shows connection errors or empty data

**Solutions:**

1. Verify API is running:

```bash
curl http://localhost:3000/api/health/readiness
```

2. Check `config.json` in UI directory:

```json
{
  "apiBaseUrl": "http://localhost:3000"
}
```

3. Check browser console for CORS errors
4. Ensure API and UI URLs match (both localhost or both domain names)
5. If using different hosts, configure CORS in API environment variables

#### Database connection failures

**Symptom**: API logs show "MongoServerError" or connection timeouts

**Solutions:**

```bash
# Test MongoDB connectivity
mongosh $DATABASE_URI --eval "db.runCommand({ ping: 1 })"

# Check MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongod  # Linux

# Start MongoDB if stopped
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux
```

For MongoDB Atlas:

- Verify IP address is whitelisted in Atlas console
- Check username/password in connection string
- Ensure database user has read/write permissions

#### High memory usage

**Symptom**: Node.js process consumes excessive memory

**Solutions:**

- Limit memory with Node.js flags:

```bash
node --max-old-space-size=2048 index.js
```

- Review query result sizes and implement pagination
- Check for memory leaks with debug logging
- Consider containerized deployment for better resource isolation

#### Configuration not loading

**Symptom**: Changes to configuration files have no effect

**Solutions:**

- Verify `CONFIG_DIR` environment variable points to correct path
- Check file permissions on configuration files
- Ensure configuration file format is valid (JSON, YAML)
- Restart the API process after configuration changes
- Check logs for configuration parsing errors

### Performance optimisation

**Monitor performance:**

```bash
# CPU and memory usage
top -p $(pgrep -f "node index.js")
```

### Development tips

**Debug mode:**

```bash
# Run with Node.js inspector
node --inspect index.js

# Then open chrome://inspect in Chrome browser
```

**Environment-specific configuration:**

```bash
# Use .env files for different environments
cp .env.example .env.development
cp .env.example .env.testing

# Load appropriate config
node -r dotenv/config index.js dotenv_config_path=.env.development
```

### Upgrading

**Update to newer version:**

1. Backup your data:

```bash
mongodump --uri=$DATABASE_URI --out=backup-$(date +%Y%m%d)
```

2. Stop the API
3. Download and extract new version
4. Copy configuration files from old version
5. Restart with new version:

```bash
node start index.js --name code-metrics-api
```

6. Verify health endpoint:

```bash
curl http://localhost:3000/api/health/readiness
```

### Getting help

If issues persist:

1. Enable debug logging: `LOG_LEVEL=2`
2. Check logs for detailed error messages
3. Review the [configuration documentation](./configuration.md)
4. Test components individually (database, API, UI)
5. Join the [Code Metrics community](https://github.com/code-metrics-project) for support
