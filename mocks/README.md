# Mocks

This directory holds mocks of the third party systems invoked by the backend using [Imposter](https://imposter.sh).

## Directory Structure

- `github/`, `azure/`, `jira/`, etc. - External VCS/service mocks
- `config/` - Configuration files for mock workloads and quality gates
- `oidc-server/` - OIDC authentication mock

## Getting started

### Prerequisites

Install [Imposter](https://imposter.sh) CLI:

    brew tap imposter-project/imposter
    brew install imposter

### Start mocks

Run Imposter:

    imposter up -r

Mocks are available on port 8080.

## How to use the mocks

In `remote-config.json`, define a server taking note of the `id` that references your running mock server instance of each type, for example for JIRA:

```
{
  "projectManagement": {
    "jira": {
      ...
      "servers": [
        {
          "id": "mock-jira",
          "url": "http://localhost:8080",
          "email": "user@example.com",
          "apiKey": "",
          "authMethod": "BASIC_AUTH",
          "bugTypes": ["Bug", "DevBug", "StaticBug", "OpsBug"],
          "prodFilterJql": "\"Project Environment[Dropdown]\" = PROD",
          "project": "P1"
        },
        ...
```

In `workload-config.json`, ensure your mock workload references the correct jira server via the same `ids` as defined within your remote :

```
{
  "workloads": [
    {
      "id": "test",
      "codeManagement": {
        "type": "azure",
        "serverId": "mock-azure",
        "projectName": "athena",
        "repoGroups": {
          "frontend": { "sonarTags": ["ibt-fe"] },
          "backend": { "sonarTags": ["ibt-be"] },
          "mocks": { "sonarTags": ["ibt-mocks"] },
          "platform": {
            "components": [ { "repo": "/.*_platform/" }, { "repo": "/.*_infrastructure/" }]
          }
        }
      },
      "codeAnalysis": {
        "type": "sonar",
        "serverId": "mock-sonar"
      },
      "projectManagement": {
        "type": "jira",
        "serverId": "mock-jira",
        "teamFilterJql": "\"Team name[Dropdown]\" in (\"IBT\")"
      }
    },
    ...
```

Start mocks:

```
$ cd mocks
$ imposter up -r
...
10:37:35 INFO  i.g.i.Imposter - Mock engine up and running on http://localhost:8080
```

### Implementation notes

The Jira and ADO mocks have both a monthly bias (so there is an overall trend by month), as well as a daily one (e.g. weekends have lower activity).
