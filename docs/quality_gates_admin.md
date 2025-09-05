# Quality Gates - Administration Guide

This guide explains how to configure and manage Quality Gates in CodeMetrics. Quality Gates are automated checks that ensure code meets quality standards before progressing to higher environments.

## Overview

Quality Gates work by:

1. Reading `quality-gate.manifest.json` files from repositories
2. Correlating these with actual CI/CD pipeline configurations
3. Checking which quality gates are required for merging code
4. Presenting this information in the CodeMetrics dashboard

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

### Repository Discovery

CodeMetrics discovers quality gate manifests by:

1. Iterating through configured workloads
2. Retrieving repository lists for each workload
3. Attempting to fetch `quality-gate.manifest.json` from each repository
4. Parsing and storing the manifest data

### API Endpoints

Quality Gates data is available via the API:

```http
POST /api/quality-gates
Content-Type: application/json

{
  "workloads": ["workload-1", "workload-2"],
  "repoGroups": []
}
```

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

## Best Practices

### Manifest Maintenance

1. **Keep Manifests Up-to-Date**: Update manifests when CI/CD configurations change
2. **Use Consistent Naming**: Standardise service tags and quality gate names across repositories
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
