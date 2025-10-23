# CodeMetrics MCP Server

The CodeMetrics Model Context Protocol (MCP) server enables AI assistants to securely query engineering metrics from your CodeMetrics instance. This integration allows you to interact with your engineering data using natural language through AI tools such as VS Code Copilot, Cursor, and Claude Desktop.

> **AI Safety Notice**: AI assistants can make mistakes, produce incorrect outputs, or hallucinate information. Always verify the results returned by the AI assistant against your actual CodeMetrics data. Do not rely solely on AI-generated analysis for critical business decisions without independent verification. The AI assistant interprets your queries and constructs API calls, but may misunderstand your intent or present data incorrectly.

## Overview

The MCP server exposes CodeMetrics query capabilities through four main tools:

- **execute_codemetrics_query** - Execute specific queries against the CodeMetrics API
- **list_available_queries** - Discover available query types and their requirements
- **test_codemetrics_connection** - Test connectivity and authentication to the CodeMetrics API
- **list_codemetrics_workloads** - List all available workloads and their repository groups

This allows AI assistants to help you analyze code quality, DORA metrics, pipeline performance, bug trends, and more, using natural language queries.

## Prerequisites

Before setting up the MCP server, ensure you have:

1. **A running CodeMetrics instance** - Either locally or deployed to an accessible environment
2. **Node.js installed** - Version 18 or higher
3. **A Service Token** - For authenticating to the CodeMetrics API

## Step 1: Obtain a Service Token

The MCP server requires a Service Token to authenticate with the CodeMetrics API.

Follow the instructions in [Authenticating to the CodeMetrics API](./integration_api_authentication.md) to generate a Service Token for your MCP server. You can use either the Administration Portal (recommended) or the API method.

**Security Note**: Store your Service Token securely. Never commit it to source control or share it publicly.

## Step 2: Configure the MCP Server

Navigate to the MCP server directory and configure your environment:

```bash
cd /path/to/code-metrics/mcp
```

Create a `.env` file with your configuration:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your settings:

```bash
# The base URL of your CodeMetrics API
CODEMETRICS_API_URL=http://localhost:3000

# Your Service Token from Step 1
CODEMETRICS_API_TOKEN=your-service-token-here
```

## Step 3: Build the MCP Server

Install dependencies and build the server:

```bash
npm install
npm run build
```

## Step 4: Configure Your AI Tool

The MCP server supports two transport modes:

- **HTTP Transport** (Recommended) - Uses modern Streamable HTTP transport with better debugging and connection management
- **Stdio Transport** (Legacy) - Traditional process-based transport

### VS Code Configuration

VS Code supports the MCP server through the MCP extension.

#### Installation

1. Install the "Model Context Protocol" extension from the VS Code marketplace
2. Reload VS Code

#### Configuration (HTTP Transport - Recommended)

**Step 1:** Start the MCP server with HTTP transport:

```bash
cd /path/to/code-metrics/mcp
node dist/index.js --http --port=3210
```

Or use environment variables from your `.env` file:

```bash
cd /path/to/code-metrics/mcp
node dist/index.js --http --env-file=.env
```

**Step 2:** Configure VS Code settings (`settings.json`):

```json
{
  "mcp": {
    "mcpServers": {
      "codemetrics": {
        "url": "http://127.0.0.1:3210/mcp"
      }
    }
  }
}
```

#### Configuration (Stdio Transport)

Alternatively, use stdio transport where VS Code launches the server automatically:

```json
{
  "mcp": {
    "mcpServers": {
      "codemetrics": {
        "command": "node",
        "args": ["/absolute/path/to/code-metrics/mcp/dist/index.js"],
        "env": {
          "CODEMETRICS_API_URL": "http://localhost:3000",
          "CODEMETRICS_API_TOKEN": "your-service-token-here"
        }
      }
    }
  }
}
```

Replace `/absolute/path/to/code-metrics/mcp/dist/index.js` with the actual path on your system.

### Cursor Configuration

Cursor uses the same configuration format as VS Code.

#### Configuration (HTTP Transport - Recommended)

**Step 1:** Start the MCP server:

```bash
cd /path/to/code-metrics/mcp
node dist/index.js --http --port=3210 --env-file=.env
```

**Step 2:** Add to your Cursor settings (`settings.json`):

```json
{
  "mcp": {
    "mcpServers": {
      "codemetrics": {
        "url": "http://127.0.0.1:3210/mcp"
      }
    }
  }
}
```

#### Configuration (Stdio Transport)

```json
{
  "mcp": {
    "mcpServers": {
      "codemetrics": {
        "command": "node",
        "args": ["/absolute/path/to/code-metrics/mcp/dist/index.js"],
        "env": {
          "CODEMETRICS_API_URL": "http://localhost:3000",
          "CODEMETRICS_API_TOKEN": "your-service-token-here"
        }
      }
    }
  }
}
```

### Claude Desktop Configuration

Claude Desktop supports MCP servers through its configuration file.

#### Configuration (HTTP Transport - Recommended)

**Step 1:** Start the MCP server:

```bash
cd /path/to/code-metrics/mcp
node dist/index.js --http --port=3210 --env-file=.env
```

**Step 2:** Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "codemetrics": {
      "url": "http://127.0.0.1:3210/mcp"
    }
  }
}
```

**Step 3:** Restart Claude Desktop to apply the configuration.

#### Configuration (Stdio Transport)

```json
{
  "mcpServers": {
    "codemetrics": {
      "command": "node",
      "args": ["/absolute/path/to/code-metrics/mcp/dist/index.js"],
      "env": {
        "CODEMETRICS_API_URL": "http://localhost:3000",
        "CODEMETRICS_API_TOKEN": "your-service-token-here"
      }
    }
  }
}
```

## Step 5: Verify the Connection

Test that your MCP server is working correctly by asking your AI assistant:

```
Test the connection to CodeMetrics
```

The AI assistant should use the `test_codemetrics_connection` tool and confirm successful authentication to your CodeMetrics instance.

You can also ask:

```
What workloads are available in CodeMetrics?
```

This will use the `list_codemetrics_workloads` tool to retrieve your configured workloads.

## Using the MCP Server

Once configured, you can interact with your CodeMetrics data using natural language. Here are some examples:

### Getting Started

Ask your AI assistant exploratory questions:

- "What queries are available in CodeMetrics?"
- "Show me the workloads configured in CodeMetrics"
- "What are the repository groups for the frontend workload?"

### Code Quality Metrics

- "Show me the code coverage for the backend team over the last 30 days"
- "What is the cyclomatic complexity trend for our API services?"
- "How many lines of code have been added to the frontend repositories this quarter?"

### DORA Metrics

- "What is our deployment frequency for production services this month?"
- "Calculate the lead time for changes for the product team"
- "Show me the change failure rate for the last quarter"
- "What is our mean time to restore service for production incidents?"

### Bug and Issue Analysis

- "How many new bugs were opened in the last sprint?"
- "Show me open high-priority bugs across all teams"
- "Which files are most frequently involved in bug fixes?"

### Pipeline Performance

- "What is the success rate of our CI pipeline this week?"
- "Show me pipeline durations for the main branch"
- "How long do pull requests stay open on average?"

### Security

- "Show me security vulnerabilities in our backend services"
- "What are the critical vulnerabilities in our codebase?"

## Supported Query Types

The MCP server supports all CodeMetrics query types:

### Code Quality Metrics

- `code-coverage` - Test coverage metrics
- `cyclomatic-complexity` - Code complexity metrics
- `lines-of-code` - Lines of code (ncloc) metrics

### DORA Metrics

- `deployment-frequency` - How often deployments occur
- `lead-time-for-changes` - Time from commit to deployment
- `change-failure-rate` - Percentage of changes that cause failures
- `time-to-restore-service` - Time to recover from incidents

### Issue & Incident Tracking

- `bugs-new` - New bugs opened
- `bugs-open` - Currently open bugs
- `production-incidents` - Production incidents

### Pipeline & Development Metrics

- `pipeline-runs` - CI/CD pipeline execution metrics
- `pipeline-durations` - Pipeline execution times
- `repo-churn` - Repository change activity
- `pr-open-time` - Pull request open durations
- `pr-size` - Pull request size metrics
- `change-categories` - Types of changes (commit/PR/ticketed)
- `non-working-pattern` - Changes outside normal hours

### Security

- `vulnerabilities` - Security vulnerability metrics

## Advanced Configuration

### Custom Port

Change the default HTTP port (3210) using the `--port` flag:

```bash
node dist/index.js --http --port=8080
```

Or set the `MCP_PORT` environment variable:

```bash
MCP_PORT=8080 node dist/index.js --http
```

### Running as a Background Service

For production use, consider running the MCP server as a background service using tools like:

- **systemd** (Linux)
- **launchd** (macOS)
- **PM2** (cross-platform Node.js process manager)

Example using PM2:

```bash
npm install -g pm2
pm2 start dist/index.js --name codemetrics-mcp -- --http --env-file=.env
pm2 save
pm2 startup
```

### Health Check

When using HTTP transport, verify the server is running:

```bash
curl http://127.0.0.1:3210/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Security Considerations

### Network Security

- The HTTP server binds to `127.0.0.1` (localhost only) by default for security
- Origin headers are validated to prevent DNS rebinding attacks
- Always use HTTPS when connecting to remote CodeMetrics instances

### Token Management

- Store Service Tokens in secure locations (environment variables, secret managers)
- Never commit Service Tokens to source control
- Rotate Service Tokens regularly (default expiry: 1 year)
- Revoke tokens immediately if compromised

For more information on token management, see [Authenticating to the CodeMetrics API](./integration_api_authentication.md).

### File Permissions

Ensure your `.env` file has appropriate permissions:

```bash
chmod 600 .env
```

## Troubleshooting

### Connection Errors

**Problem**: "Cannot connect to CodeMetrics API"

**Solutions**:

- Verify `CODEMETRICS_API_URL` is correct and accessible
- Check that your CodeMetrics instance is running
- Ensure network connectivity to the CodeMetrics API

### Authentication Errors

**Problem**: "401 Unauthorized" or "Invalid token"

**Solutions**:

- Verify your Service Token is correct and not expired
- Generate a new Service Token if needed
- Check that the token is properly set in your `.env` file

### MCP Server Not Starting

**Problem**: Server fails to start or crashes

**Solutions**:

- Check for port conflicts (default: 3210)
- Verify Node.js version (requires v18+)
- Review server logs for error messages
- Ensure dependencies are installed: `npm install`

### AI Assistant Not Using MCP Tools

**Problem**: AI assistant doesn't query CodeMetrics

**Solutions**:

- Verify the MCP server is running and accessible
- Check your AI tool's MCP configuration
- Restart your AI tool after configuration changes
- Try asking explicitly: "Use CodeMetrics to show me..."

### Query Timeouts

**Problem**: Queries take too long or timeout

**Solutions**:

- Limit date ranges for large datasets
- Use specific workload filters instead of "all"
- Check CodeMetrics API performance
- HTTP transport has 5-minute timeouts; consider if queries need optimization

## Further Reading

- [CodeMetrics API Integration Overview](./integration_api.md)
- [Authenticating to the CodeMetrics API](./integration_api_authentication.md)
- [CodeMetrics Queries Documentation](./queries.md)
- [DORA Metrics](./dora.md)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

## Support

For issues or questions about the MCP server:

1. Check the troubleshooting section above
2. Review the MCP server logs for error messages
3. Consult the CodeMetrics documentation
4. Contact your CodeMetrics administrator
