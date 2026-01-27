# Configuration

There are three primary files to configure CodeMetrics.

- **remote-config.yaml** - controls how you connect to your external systems
- **workload-config.yaml** - how you represent your teams/repositories
- **license.yaml** - the license key to run the software

These files model how your teams are organised, and contain settings to interact securely with external data sources for Code Quality (e.g. Sonar), Project Management (e.g. Jira) and Code Management (e.g. GitHub).

### External Systems (remote-config.yaml)

The `remote-config.yaml` file controls how you connect to your external systems.

Start by copying the file `examples/remote-config.yaml` and name it `remote-config.yaml`, then set the configuration relevant for your team's tooling setup.

This file has a section for each type of external system:

- **Code Management** - See how to [configure code management](./config_code_management.md) settings.
- **Pipelines** - See how to [configure pipelines](./config_pipelines.md) settings.
- **Code Quality** - See how to [configure code quality](./config_code_quality.md) settings.
- **Project Management (bugs)** - See how to [configure project management](./config_project_management.md) settings.
- **Production Incidents** - See how to [configure incidents](./config_incidents.md) settings.

> **Note**
> Supported external systems are described in [the features section](./features.md).

### Teams, repositories and workloads (workload-config.yaml)

The `workload-config.yaml` file models how you represent your teams/repositories.

Start by copying the file `examples/workload-config.yaml` and name it `workload-config.yaml`.

This file contains the structure and hooks used to organise and map the data produced within the remote systems to each team. The information gathered can be aggregated and filtered based on the options provided.

➡️ [Learn about configuring workloads](./config_workloads.md)

### License file (license.yaml or license.json)

This file contains the license key and the associated email address.

For example:

```yaml
# license.yaml
---
email: test@example.com
key: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Place the license file in the configuration directory. The license is validated when the application starts.

---

## Additional configuration

Depending on how you set up your [authentication](./authentication.md) and [secrets management](./secret_management.md), there may be additional files too.

Some advanced settings can be controlled using [environment variables](./env_vars.md).

### User authentication

See the [user authentication](./authentication.md) section.

### Deployments

See the [deployments](./config_deployments.md) section.

### Custom queries

You can define custom queries using a JSON file. See [custom queries](custom_queries.md) for details.

---

## Advanced configuration

### Locating configuration files

The path to the directory containing configuration files is set by the environment variable `CONFIG_DIR`.

> This path defaults to the working directory, or `/backend/config` when using the CodeMetrics Docker image.

For example:

```
CONFIG_DIR=/path/to/config/files
```

#### Multiple configuration directories

You can specify multiple configuration directories by separating them with a comma.

```
CONFIG_DIR=/path/to/foo,/path/to/bar
```

Configuration files will be discovered in the order the directories are listed.

### File format

Configuration files can be in JSON or YAML format. For example, `remote-config.yaml`, or `remote-config.yml` or `remote-config.json`.

In the documentation we refer to the YAML filenames, but the same structure applies to JSON format files in line with JSON syntax.

Examples of all configuration files are provided by the project, e.g. `examples/remote-config.yaml`.

#### CORS

If you need to adjust the origin of the web UI, edit the `CORS_ORIGIN` environment variable in the `backend` service.

For example:

```
CORS_ORIGIN=http://localhost:3001
```
