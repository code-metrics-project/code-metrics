# Quality Gates - Administration Guide

This guide explains how to configure and manage Quality Gates in CodeMetrics. Quality Gates are automated checks that ensure code meets quality standards before progressing to higher environments.

## Overview

Quality Gates work by:

1. Reading `quality-gate.manifest.json` files from repositories
2. Correlating these with actual CI/CD pipeline configurations
3. Checking which quality gates are required for merging code
4. Organizing repositories by repository groups
5. Calculating aggregate metrics for each repository group
6. Presenting this information in the CodeMetrics dashboard as color-coded cards

## Repository Configuration

### Quality Gate Manifest File

Each repository that wants to participate in Quality Gates reporting must include a `quality-gate.manifest.json` file in its root directory.

#### File Structure

```json
{
  "$schema": "https://github.com/octocat/quality-gates/tree/v0.1.0/schemas/schema.json",
  "services": [
    {
      "service-tag": "my-service-name",
      "quality-gates": [
        {
          "check-types": ["code style and linting"],
          "provider": "GitHub",
          "phase": "pre-merge",
          "config": {
            "file": ".github/workflows/pre-commit.yml",
            "path": "jobs.pre-commit",
            "name": "Run pre-commit"
          }
        },
        {
          "check-types": ["unit"],
          "provider": "GitHub",
          "phase": "pre-merge",
          "config": {
            "file": ".github/workflows/ci.yml",
            "path": "jobs.unit-tests",
            "name": "Unit Tests"
          }
        }
      ]
    }
  ]
}
```

#### Field Definitions

**Root Level:**

- `$schema`: (Optional) JSON schema URL for validation
- `services`: Array of service configurations

**Service Level:**

- `service-tag`: Unique identifier for the service within the repository

**Quality Gate Level:**

- `check-types`: Array of quality check categories
- `provider`: The CI/CD system running the check (e.g., "GitHub", "Azure DevOps")
- `phase`: When the check runs (`pre-merge` or `build`)
- `config`: Configuration details for the quality gate

**Config Object:**

- `file`: Path to the CI/CD configuration file
- `path`: Specific job or step within the configuration file
- `name`: Display name for the quality gate (used for matching required status checks)

### Supported Check Types

Quality Gate check-types are free text entry. Any check types included in any `quality-gate.manifest.json` will be listed. This is to minimise the amount of configuration required in codemetrics, and to make visibile variations in how manifests are configured.

### Supported Providers

This is currently only implemented for github repositories and actions.

## Required Status Checks Integration

CodeMetrics automatically determines which quality gates are required for merging by:

1. **Fetching Branch Protection Rules**: Retrieving required status checks from the version control system
2. **Matching by Name**: Correlating the `config.name` field with required status check names
3. **Marking as Required**: Quality gates with matching names are marked as required

### GitHub Integration

For GitHub repositories, CodeMetrics:

- Fetches branch protection rules via the GitHub API
- Compares the `required_status_checks` with quality gate names
- Marks matching quality gates with the "required" indicator

**Note**: GitHub uses job names as the only connection point between workflows and required status checks. Ensure your `config.name` matches exactly with the required status check name configured in branch protection rules.

## System Configuration

### Workload Configuration

Quality Gates respect existing workload configurations. Ensure your workloads are properly configured to include the repositories you want to monitor.

### Environment Variables

Quality Gates use environment variables to configure the thresholds for visual indicators:

**QUALITY_GATE_THRESHOLD_DANGER**

- **Purpose**: Sets the minimum percentage for the danger threshold
- **Default**: 30
- **Usage**: Repository groups with implementation percentages below this value display with a red (danger) indicator
- **Example**: Setting this to 40 means groups with less than 40% coverage show as red

**QUALITY_GATE_THRESHOLD_WARNING**

- **Purpose**: Sets the minimum percentage for the warning threshold
- **Default**: 80
- **Usage**: Repository groups with implementation percentages at or above the danger threshold but below this value display with an orange (warning) indicator
- **Example**: With defaults, groups with 30-79% coverage show as orange

**Threshold Logic:**

- Below danger threshold: Red indicator
- Between danger and warning thresholds: Orange indicator
- At or above warning threshold: Green indicator
- No data available: Grey indicator

These thresholds allow you to customize what constitutes acceptable quality gate coverage for your organization.

### Repository Discovery

CodeMetrics discovers quality gate manifests by:

1. Iterating through configured workloads
2. Organizing repositories into repository groups
3. Retrieving repository lists for each repository group
4. Attempting to fetch `quality-gate.manifest.json` from each repository
5. Parsing and storing the manifest data
6. Filtering services to match repository group names (see Service Filtering below)

### Service Filtering

When a repository manifest defines multiple services, CodeMetrics filters the services based on the repository group:

**Single Service**: If a manifest defines only one service, that service is used regardless of its service tag.

**Multiple Services**: If a manifest defines multiple services, only the service whose `service-tag` matches the repository group name is included in the results for that group. This allows:

- A single repository to report quality gates for multiple services
- Each service to be displayed in the appropriate repository group context
- Clean separation of concerns when a repository contains multiple deployable services

**Missing Service Match**: If a repository with multiple services has no service tag matching the repository group name, the repository will be included in the group but marked as having no matching service data.

### API Endpoints

Quality Gates data is available via the API through a POST request to `/api/quality-gates`. The request body should specify the workloads and optionally the repository groups you want to retrieve data for.

**Request Parameters:**

- `workloads`: Array of workload IDs to query
- `repoGroups`: Optional array of repository group names to filter results

**Response Structure:**

The API returns data organized hierarchically:

1. **Workload Level**: Each workload in the response contains an array of repository groups
2. **Repository Group Level**: Each repository group includes:
   - Headline metrics showing overall quality gate coverage
   - Implementation score (numerator and denominator)
   - Count of repositories with missing data
   - Visual variant indicator (success, warning, danger, or no_data)
   - Array of repositories in the group
3. **Repository Level**: Each repository includes:
   - Repository name and link
   - Services defined in the manifest
   - Quality gates organized by type and phase

**Headline Metrics Calculation:**

The headline metrics for each repository group are calculated based on the repository with the lowest quality gate implementation percentage within that group. This "worst-case" approach ensures that the overall score reflects the minimum quality standard in the group. The metrics include:

- **Numerator**: Number of quality gate types implemented (in the lowest-scoring repository)
- **Denominator**: Total number of quality gate types defined in your configuration
- **Missing**: Count of repositories without manifests or matching service definitions
- **Variant**: Color indicator based on the implementation percentage

## Troubleshooting

### Missing Quality Gates

**Problem**: Repository doesn't appear in Quality Gates dashboard

**Solutions**:

1. Verify `quality-gate.manifest.json` exists in repository root
2. Check JSON syntax is valid
3. Ensure repository is included in workload configuration
4. Verify CodeMetrics has access to read the repository

### Quality Gates Not Marked as Required

**Problem**: Quality gates appear but aren't marked as required

**Solutions**:

1. Check branch protection rules are configured in version control system
2. Verify the `config.name` exactly matches the required status check name
3. Ensure CodeMetrics has permissions to read branch protection settings

### Manifest Parsing Errors

**Problem**: Quality gate manifest is ignored or causes errors

**Solutions**:

1. Validate JSON syntax using a JSON validator
2. Check all required fields are present
3. Verify `check-types` values match supported types
4. Ensure `phase` is either `pre-merge` or `build`

## Repository Groups and Organization

Quality Gates are organized and displayed by repository groups, which provide logical grouping of related repositories. This organization:

**Provides Aggregate Views**: Each repository group displays an overall implementation score, making it easy to assess quality gate coverage at a group level rather than examining individual repositories.

**Enables Service Filtering**: When repositories contain multiple services, the service tag can match the repository group name to ensure appropriate data is displayed in each group context.

**Calculates Worst-Case Metrics**: The headline metrics for a repository group are based on the repository with the lowest implementation percentage within that group. This conservative approach ensures that:

- High-level indicators reflect the minimum quality standard
- Groups with even one poorly-configured repository are highlighted
- Improvements in the weakest repositories have visible impact

**Tracks Missing Data**: The system separately tracks repositories without manifests or matching service definitions, providing visibility into:

- Repositories that need quality gate configuration
- Services that may need service tags added to manifests
- Overall data completeness for each group

**Repository Group Best Practices:**

- Align service tags with repository group names for multi-service repositories
- Ensure all repositories in a group have quality gate manifests
- Use repository groups to organize services by team, product, or functional area
- Monitor group-level metrics to identify areas needing attention

## Best Practices

### Manifest Maintenance

1. **Keep Manifests Up-to-Date**: Update manifests when CI/CD configurations change
2. **Use Consistent Naming**: Standardise service tags and quality gate names across repositories; align service tags with repository group names for multi-service repositories
3. **Document Check Types**: Ensure check types accurately reflect what's being tested
4. **Version Control**: Treat manifests as critical configuration files

### Quality Gate Strategy

1. **Progressive Enhancement**: Start with basic checks and add more over time
2. **Consistent Standards**: Use similar quality gates across similar services
3. **Required vs Optional**: Be intentional about which checks should block merges
4. **Regular Review**: Periodically review quality gate effectiveness

### Integration with Development Workflow

1. **Developer Education**: Ensure teams understand what each quality gate checks
2. **Clear Feedback**: Make sure CI/CD systems provide clear feedback on failures
3. **Documentation**: Link quality gate configurations to development process documentation

## Advanced Configuration

### Multiple Services Per Repository

Repositories can define multiple services:

```json
{
  "services": [
    {
      "service-tag": "frontend-service",
      "quality-gates": [...]
    },
    {
      "service-tag": "backend-service",
      "quality-gates": [...]
    }
  ]
}
```

### Custom Check Types

While standard check types are recommended, custom check types can be defined:

```json
{
  "check-types": ["custom-security-scan"],
  "provider": "GitHub",
  "phase": "pre-merge",
  "config": {
    "file": ".github/workflows/security.yml",
    "path": "jobs.security-scan",
    "name": "Security Scan"
  }
}
```

### Multi-Phase Quality Gates

Quality gates can be configured for different phases:

```json
{
  "quality-gates": [
    {
      "check-types": ["unit"],
      "phase": "pre-merge",
      "config": {...}
    },
    {
      "check-types": ["integration"],
      "phase": "build",
      "config": {...}
    }
  ]
}
```
