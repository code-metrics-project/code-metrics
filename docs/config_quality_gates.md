# Configuration: Quality Gates

This section describes the `quality-gates-config.yaml` configuration file. See the [configuration overview](./configuration.md) for further information.

## Overview

Quality gates define named sets of environments and test/verification gates that your programme or workload should meet. Workloads reference a specific quality gates definition by `id` and `version`.

## Example file

```yaml
quality-gates:
  - id: default
    version: 0.1.0
    environments:
      - pre-merge
      - pre-upload
      - build
      - staging
      - production
      - integration
    gates:
      - accessibility
      - canary
      - code style and linting
      - contract
      - cross service integration
      - integration
      - new feature
      - regression
      - secret scanning
      - sensitive data scanning
      - smoke
      - stack
      - system
      - unit
      - unit test coverage
      - vulnerability detection
  - id: alternative
    version: 0.1.0
    environments:
      - pre-merge
      - production
    gates:
      - accessibility
      - canary
      - code style and linting
      - unit
      - vulnerability detection
```

## Schema

A quality gates configuration file contains a top-level key `quality-gates` which is a list of objects with the following fields:

- `id` (string): Identifier for the quality gates definition.
- `version` (string): Semantic version of the definition. Used to allow safe evolution over time.
- `environments` (string[]): List of environments where gates are assessed (e.g. `pre-merge`, `staging`, `production`).
- `gates` (string[]): List of gate names relevant to your organisation (e.g. `unit`, `smoke`, `vulnerability detection`). The number of gates defined here determines the denominator used in calculating quality gate coverage percentages for repository groups.

## Referencing from a workload

Workloads link to a quality gates definition by ID and version:

```yaml
workloads:
  - id: team-athena
    # ...
    qualityGates:
      id: default
      version: 0.1.0
```

The referenced item must exist in `quality-gates-config.yaml`. If the `id` and `version` combination cannot be found or a workload omits `qualityGates`, the backend will raise an error when loading configuration.

## File name and location

- Default file name: `quality-gates-config.yaml`
- Location: place alongside other configuration files in your configuration directory (see [configuration overview](./configuration.md)).

## UI

The Quality Gates page uses the selected workload's mapped quality gates to organize and display quality gate information:

- **Environments**: Used to group quality gates by phase in the detailed repository view
- **Gates**: Used to determine the total number of quality gate types, which forms the denominator in coverage percentage calculations

The Quality Gates dashboard displays repositories organized by repository groups, with each group showing:

- An implementation score comparing implemented quality gates to the total defined gates
- Color-coded indicators based on the percentage of gates implemented
- Detailed breakdown of which specific gate types are configured for each repository

Update your workload's quality gates mapping to change the environments and gates used for assessment. Adding more gates to the configuration will increase the denominator, potentially lowering coverage percentages until teams implement the additional quality checks.
