# GitHub Actions CI/CD

This directory contains the CI/CD pipeline configurations for the Code Metrics project. The pipeline uses a "smart build" approach to only run tests and builds for components that have changed (or their dependencies).

## Change Detection Architecture

The core of the optimization strategy is the `set_vars.py` script, which compares the current commit against the base branch (default: `main`) to determine which directories have been modified.

### `set_vars.py`

This script runs early in the `ci.yaml` workflow. It:

1.  Analyzes `git diff` for modified files.
2.  Maps modified files to component keys defined in `change_detection_config.json`.
3.  Applies "fold rules" (dependencies) to propagate changes (e.g., "if backend changes, also test mocks").
4.  Outputs a JSON object to `GITHUB_OUTPUT` containing boolean flags for each component (e.g., `backendComponents=1`).

These flags are then used in `if:` conditions in subsequent jobs to skip unnecessary work.

## Configuration: `change_detection_config.json`

This JSON file controls the change detection logic. It has two main sections:

### 1. `service_dirs`

Maps a logical component name to a list of file paths or glob patterns to watch.

- Use path prefixes to include directories (e.g., `"headers": ["backend/src/headers"]`).
- Use `:!` prefix to explicitly exclude files (e.g., `":!docker/Dockerfile.ui"`).

**Example:**

```json
"docker_ui": ["docker/Dockerfile.ui", "ui/.dockerignore"]
```

This defines a `docker_ui` component that changes only if the specific Dockerfile or ignore file changes.

### 2. `fold_rules`

Defines dependencies between components using keys from `service_dirs`. If the **key** component changes, the **value** list components are also marked as changed (Logic: `CHANGED(key) OR CHANGED(value)`).

**Example:**

```json
"backend": ["mocks"]
```

If `backend` code changes, the `mocks` component is also flagged to run (ensuring integration tests pass).

**Global Triggers:**
Keys like `.github` can be mapped to _all_ components to ensure that infrastructure changes trigger a full system rebuild.

## Workflow Inventory

### Core Pipeline

- **`ci.yaml`**: The main orchestrator. Triggered on Pull Request and Push. It calculates changed components and calls other reusable workflows.
- **`validate.yaml`**: runs Unit Tests, Linting, and E2E tests. This is the "Gatekeeper" workflow that must pass before builds occur.
- **`docker.yaml`**: Builds and pushes Docker images. This runs _after_ validation in the release flow, or independently for Dockerfile-only changes.
- **`cd.yaml`**: Handles deployment artefacts after successful builds.

### Helper Workflows

- **`backend.yaml`**: Reusable workflow for backend-specific build/test steps.
- **`update-github-container-reg.yaml`**: Automated housekeeping for GHCR - pulls required docker images from Docker Hub and pushes them to GHCR.
- **`upload-image.yaml`**: Manual tool to pull images from Docker Hub and push to GHCR to prevent catch 22 of builds failing as a new required image has not been uploaded to GHCR.

## How to Configure

To add a new service:

1.  Define its path in `service_dirs` in `change_detection_config.json`.
2.  Add any dependencies in `fold_rules`.
3.  Update `ci.yaml` / `validate.yaml` / `docker.yaml` / `cd.yaml` to include a new job that checks `if: ${{ fromJSON(inputs.vars).myNewServiceComponents != 0 }}`.
