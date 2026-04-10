# Temporal Coupling

Identifies files that frequently change together in pull requests. This analysis helps reveal hidden dependencies and areas of the codebase that are tightly coupled.

Available dimensions:

- workload name
- start date

## Feature Flag

This feature is currently behind a feature flag. To enable it, set `FEATURE_TEMPORAL_COUPLING=true`.

## UI

The Temporal Coupling analysis provides both table and ribbon chart views of file pairs.

### Table View

The results show pairs of files that co-occur in pull requests:

- **File A / File B**: The paths of the two files that changed together
- **Co-changes**: The number of pull requests where both files were modified together
- **Percentage**: The percentage of total analyzed PRs where this co-occurrence happened

High co-change counts or percentages often indicate that these files are logically coupled and might benefit from refactoring to improve modularity.

### Ribbon View

The ribbon view displays file-to-file coupling links, where thicker ribbons represent higher co-change counts.