# Quality Gates - User Guide

Quality Gates are automated checks ensuring code meets quality standards before progressing to higher environments. These gates, configured per service and repository, verify successful test completion, code analysis, and security scans, ensuring only high-quality code reaches production.

## Overview

Quality Gates provide visibility into your development process by showing which automated checks are configured for each repository and service, organized by repository groups. This helps engineering teams understand:

- What quality checks are in place across their codebase
- Which checks are required before code can be merged
- How consistent quality standards are across different repositories
- Where gaps in quality automation might exist
- Overall quality gate coverage across repository groups

The dashboard displays quality gate information organized by repository groups, with each group showing an overall implementation score. This score indicates how many quality gate types have been implemented compared to the total number defined in your quality gates configuration. Color-coded indicators provide at-a-glance visibility into coverage levels:

- **Green**: High coverage (80% or above of defined quality gates implemented)
- **Orange**: Moderate coverage (30-79% of defined quality gates implemented)
- **Red**: Low coverage (below 30% of defined quality gates implemented)
- **Grey**: No data available (missing manifests or no matching services)

## Accessing Quality Gates

Quality Gates can be viewed at two levels:

### Programme Level

Navigate to **Programme** → **Quality Gates** to see quality gates across all workloads and repositories, organized by repository groups.

![Programme Quality Gates](img/programme_quality_gates.png)

### Workload Level

Navigate to **Workloads** → _[Select Workload]_ → **Quality Gates** to see quality gates for a specific workload, organized by repository groups.

## Understanding the Quality Gates Dashboard

The Quality Gates dashboard displays information as cards, with each card representing a repository group within a workload.

### Repository Group Cards

Each card shows:

**Header**: Color-coded to indicate the overall quality gate coverage level (green, orange, red, or grey)

**Title**: Shows the workload and repository group name

**Headline Metrics**:

- Implementation status (e.g., "5 of 8 implemented" shows that 5 quality gate types are implemented out of 8 defined in your configuration)
- Missing data count (if applicable, shows how many repositories lack quality gate manifests or matching service definitions)

**Summary Information**:

- Total number of repositories in the group

### Quality Gate Details

Expand a card to see detailed information for each repository:

**Repository Name**: Links directly to the repository in your version control system

**Quality Gate Badges**: Visual indicators showing which types of quality checks are configured:

- **Green badges**: Quality checks that are configured and enabled
- **Red badges**: Quality check types that are not configured
- **Shield icons**: Indicate whether the check is required for merge or optional

Common quality gate types include:

- **Code Style and Linting**: Automated code formatting and style checks
- **Unit**: Unit test execution
- **Integration**: Integration test execution
- **Code Quality**: Static code analysis (e.g., SonarQube)

## Viewing Detailed Information

Click the **Details** button on any repository group card to expand and view detailed information about each repository's quality gates. Within the expanded view, click **More info** next to any repository to see comprehensive details about each configured quality gate:

### Provider

The system that runs the quality check (e.g., GitHub Actions, Azure DevOps).

### Phase

When the check runs in the development lifecycle:

- `pre-merge`: Runs before code can be merged to the main branch
- `build`: Runs during the build process

### File

The configuration file that defines the quality check (e.g., GitHub workflow file).

### Path

The specific job or step within the configuration file.

### Required

Shows whether the check is required for merging (indicated by a shield icon):

- **Shield with check**: Required status check - code cannot be merged without this passing
- **Shield with outline**: Optional check - failure won't block merging

## Navigating Repository Groups

Quality gates are organized by repository groups, with each group displayed as a separate card. To find specific repositories or services:

- Browse the cards by workload and repository group
- Expand individual cards to view the repositories within each group
- Use the browser's find function (Ctrl+F or Cmd+F) to search for specific repository or service names within expanded cards

## Benefits for Development Teams

Quality Gates provide several benefits:

### Consistency

See at a glance which repository groups and repositories have comprehensive quality checks and which might need additional automation. The color-coded cards provide immediate visibility into coverage levels across your organization.

### Transparency

Understand what checks new code must pass before reaching production.

### Risk Assessment

Identify repositories with fewer quality gates that might pose higher risk.

### Process Improvement

Use the overview to standardise quality processes across teams and repositories.

## Common Quality Gate Patterns

### Comprehensive Coverage

Well-configured services typically have quality gates for:

- Code style and linting (ensuring consistent code formatting)
- Unit tests (verifying individual components work correctly)
- Integration tests (ensuring components work together)
- Code quality analysis (identifying potential bugs and technical debt)

### Risk Indicators

Repository groups or individual repositories with missing quality gates may indicate:

- Newer repositories that haven't yet implemented full automation
- Legacy services that might benefit from additional quality checks
- Opportunities to standardise development practices

Red or orange cards highlight areas that may need attention to improve quality gate coverage.

## Next Steps

If you identify repositories with limited quality gate coverage:

1. **Discuss with Development Teams**: Understand any gaps in automated quality checks
2. **Review Configuration**: Check if quality gates exist but aren't properly configured in the manifest
3. **Implement Missing Checks**: Consider adding automated quality checks where appropriate
4. **Standardise Practices**: Use well-configured repositories as templates for others

For information on setting up and configuring Quality Gates, see the [Quality Gates Administration Guide](quality_gates_admin.md).
