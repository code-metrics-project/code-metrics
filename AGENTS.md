# AI Agents Guide

This document serves as a meta-documentation and definitive guide for AI agents working on the CodeMetrics codebase. It outlines the system architecture, component technologies, and strict directives that must be followed.

## Architecture & Components

The CodeMetrics repository is a monorepo containing the following key software components:

- **`backend`** (`backend`): Core API Service.
  - _Tech_: Node.js, TypeScript, Express.
- **`desktop`** (`desktop`): Desktop Application is a wrapper for the UI and backend.
  - _Tech_: Electron, TypeScript.
- **`docker`** (`docker`): Container build definitions.
  - _Tech_: Dockerfiles.
- **`examples`** (`examples`): Demo configurations and Jenkins integration.
  - _Tech_: Jenkinsfile, YAML configs.
- **`helm`** (`helm`): Kubernetes deployment charts.
  - _Tech_: Helm Charts.
- **`machinelearning`** (`machinelearning`): Machine Learning models and pipelines.
  - _Tech_: Python, UV (package manager).
- **`mcp`** (`mcp`): CodeMetrics Model Context Protocol (MCP) Server.
  - _Tech_: Node.js, TypeScript.
- **`mocks`** (`mocks`): Service mocks for E2E testing.
  - _Tech_: Imposter, Go.
- **`promosite`** (`promosite`): Promotional and marketing website.
  - _Tech_: Astro, TailwindCSS, TypeScript.
- **`scripts`** (`scripts`): Utility scripts for build and maintenance.
  - _Tech_: Bash (Shell).
- **`threatmodel`** (`threatmodel`): Security threat models and reporting.
  - _Tech_: Markdown, Pandoc, PDF generation.
- **`tools`** (`tools`): Standalone utilities.
  - _Tech_: Node.js (`mergecoverage`), Go (`userconfig`).
- **`ui`** (`ui`): Frontend Dashboard.
  - _Tech_: React, TypeScript, Vite.

## Directives for Agents

All AI agents operating on this codebase MUST adhere to the following directives:

### 1. Documentation

#### Documentation Source of Truth (Do Not Duplicate)

- **AGENTS.md is a map + stable rules**: Keep this file focused on durable directives and pointers.
- **`/docs` is the source of truth for runbooks**: Local setup, commands, operational guidance, and other fast-changing instructions should live in `docs/` (or the relevant component `README.md`), not duplicated here.
- **Resolve conflicts in favor of docs**: If `AGENTS.md` and `docs/` disagree, treat `docs/` as authoritative and update `AGENTS.md` to point correctly.
- **Documentation updates are required**: When you change behavior, workflows, configuration, or APIs, you must update and/or add the corresponding documentation in `docs/` as part of the same work (alongside writing tests).

#### Documentation Map (Quick Links)

Use these entrypoints instead of copying instructions into this file:

- **Getting started / local dev**: `docs/getting_started.md`, `docs/run_local_node.md`
- **Environment variables**: `docs/env_vars.md`
- **Configuration overview**: `docs/configuration.md`
- **Key features & concepts**: `docs/features.md`, `docs/architecture.md`, `docs/dora.md`, `docs/queries.md`
- **Pipelines & CI/CD**: `docs/pipelines.md` and `.github/CI_CD.md`
- **Deployment options**: `docs/deployment.md` (and variants like `docs/deployment_docker.md`, `docs/deployment_lambda.md`)
- **Authentication**: `docs/authentication.md` (and provider-specific docs)

### 2. Testing

- **Mandatory Testing**: You must _always_ write tests for any new code you produce.
- **Positive & Negative**: Tests must cover both success paths (positive) and failure scenarios (negative).
- **No Permission Needed**: Do not ask for permission to write tests; consider it a requirement of the task.
- **Testing Framework**: Use Jest for JavaScript/TypeScript testing, Pytest for Python testing, Cypress for E2E testing.

### 3. Formatting

- **Consistency**: Strict adherence to the project's formatting standards is required.
- **Configuration**: Follow `.prettierrc` for JavaScript/TypeScript/JSON/YAML/Markdown files.
- **Python**: Follow PEP 8 and project-specific linting rules (e.g., `ruff`).
- **git**: Commit messages must follow the Conventional Commits specification. Prefer the same Conventional Commits format for PR titles as well (squash merges commonly use the PR title as the commit message).

### 4. Pipeline & CI/CD

- **Context**: Before modifying workflows, read [`.github/CI_CD.md`](.github/CI_CD.md) to understand the build and deployment pipeline.

### 5. CodeMetrics MCP Server

The repository includes a dedicated MCP Server located in the `mcp/` directory. This server allows AI assistants to securely execute engineering metrics queries against a CodeMetrics API instance.

### Capabilities

- **Execute Queries**: Run specific metrics queries (e.g., deployment frequency, lead time).
- **List Queries**: Discover available query types.
- **List Workloads**: Retrieve available workloads and repository groups.
- **Test Connection**: Verify API connectivity.

### Usage

For detailed instructions on running, configuring, and using the MCP server, please refer to the [**MCP README**](mcp/README.md).

```bash
# Quick Start (HTTP Transport)
cd mcp
npm run build
node dist/index.js --http --port=3210
```

### 6. Overrides

`.AGENTS_LOCAL.md` - This file can be used to override the default behavior of the agents, it is ignored by git as it may have information specific to the local environment or user. Please check for this file which may contain specifics around the developer's personal coding workflow and further expectations on running and testing the application setup while performing code delivery as an agent.
