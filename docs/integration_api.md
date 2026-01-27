# Integrating with the CodeMetrics API

CodeMetrics provides a comprehensive REST API that allows you to build custom tools and integrations on top of its data analysis capabilities. By leveraging the CodeMetrics API, you can:

- **Extract metrics programmatically** - Query source CodeMetrics, pipeline data, bug reports, and DORA metrics
- **Build custom dashboards** - Create specialized visualizations tailored to your team's needs
- **Automate reporting** - Generate regular reports and notifications based on CodeMetrics data
- **Integrate with existing tools** - Connect CodeMetrics data to your existing toolchain and workflows
- **Develop custom applications** - Build specialized applications that leverage CodeMetrics' extensive data collection and analysis capabilities

The CodeMetrics API leverages the same downstream integrations that power the web interface, giving you access to data from:

- **Source code management systems** (GitHub, Azure DevOps, Bitbucket)
- **Code quality tools** (SonarQube, SonarCloud)
- **CI/CD pipelines** (Jenkins, GitHub Actions, Azure Pipelines, AWS CodePipeline)
- **Project management systems** (Jira, Azure DevOps Work Items)
- **Incident management systems** (ServiceNow, Jira Service Desk)

This means you can build tools that combine data from multiple sources without having to implement separate integrations for each system.

## Getting Started

To begin integrating with the CodeMetrics API, you'll need to:

1. **Authenticate** - Generate a Service Token to securely access the API
2. **Explore the API** - Understand the available endpoints and data formats
3. **Build your integration** - Develop your custom tool or application

## Authentication

CodeMetrics uses Service Tokens for API authentication. These tokens provide secure, long-lived access to the API without requiring you to manage user credentials.

➡️ [Learn how to generate and use Service Tokens](./integration_api_authentication.md)

## API Endpoints

The CodeMetrics API provides endpoints for:

- **Query execution** - Run custom queries and retrieve results
- **Workload management** - Access workload configurations and metadata
- **Pipeline data** - Retrieve CI/CD pipeline runs and deployment information
- **Code analysis** - Access code quality metrics and trends
- **Bug and incident data** - Query defect and incident information
- **System administration** - Manage cache and system operations

## Example Use Cases

### Custom Reporting

Generate specialized reports combining multiple data sources:

```bash
# Example: Get test coverage and bug correlation data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queryName": "bugs-new", "args": { "workloads": ["my-team"] }' \
  https://your-codemetrics-instance/api/query
```

### Automated Monitoring

Set up automated alerts based on code quality thresholds:

```bash
# Example: Check if test coverage falls below threshold
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repoGroups": ["frontend"] }' \
  https://your-codemetrics-instance/api/codebase/aggregate
```

### Integration with External Tools

Connect CodeMetrics data to your existing dashboards and tools using the programmatic API.

## Best Practices

When building integrations with the CodeMetrics API:

- **Use service tokens** for automated systems and background processes
- **Implement proper error handling** for API responses
- **Cache data appropriately** to avoid unnecessary API calls
- **Follow rate limiting guidelines** to ensure system stability
- **Secure your tokens** and rotate them regularly

## Next Steps

- [Generate your first Service Token](./integration_api_authentication.md)
