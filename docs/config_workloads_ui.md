# UI display configuration

Workload configuration for how workloads appear in the user interface. See the [workload configuration](./config_workloads.md) for the full `workload-config.yaml` reference.

## Icons and colours

You can customise how a workload is represented in the user interface by setting the `icon` and `color` properties on a workload:

```yaml
workloads:
  - id: team-athena
    name: "Athena"
    icon: rocket
    color: "#0369a1"
    # ... other workload configuration ...
```

- `icon` is the name of a built-in icon from the [Lucide](https://lucide.dev) icon set (the same set used across the UI). If it is unset, or the name is not recognised, a circle is displayed instead.
- `color` is a CSS colour (a hex value such as `#0369a1` is recommended). If it is unset, a colour is chosen automatically from the built-in palette.

Both properties are optional and affect only the display of the workload; they have no impact on how metrics are collected or query results are calculated.

### Supported icons

`activity`, `anchor`, `atom`, `bar-chart-3`, `bell`, `book-open`, `bot`, `box`, `boxes`, `brain`, `briefcase`, `bug`, `building-2`, `bus`, `calculator`, `calendar`, `camera`, `car`, `car-front`, `chart-bar`, `chart-line`, `check`, `circle`, `clock`, `cloud`, `cloud-cog`, `cloud-lightning`, `code`, `code-2`, `coffee`, `container`, `cpu`, `credit-card`, `database`, `database-zap`, `dollar-sign`, `droplets`, `factory`, `file-text`, `film`, `flame`, `folder`, `gamepad-2`, `gauge`, `gem`, `git-branch`, `git-fork`, `globe`, `graduation-cap`, `hard-drive`, `hammer`, `headset`, `heart`, `hexagon`, `home`, `key`, `laptop`, `layers`, `landmark`, `leaf`, `lightbulb`, `line-chart`, `lock`, `mail`, `message-square`, `monitor`, `moon`, `music`, `network`, `package`, `percent`, `phone`, `pie-chart`, `plane`, `rocket`, `server`, `server-cog`, `settings`, `shield`, `shield-check`, `ship`, `shopping-bag`, `shopping-cart`, `smartphone`, `sparkles`, `square`, `star`, `sun`, `tablet`, `target`, `terminal`, `thermometer`, `timer`, `train-front`, `trending-down`, `trending-up`, `triangle`, `trophy`, `truck`, `wallet`, `wifi`, `wrench`, `zap`

### Full example

Example of a complete workload configuration with `icon` and `color` set alongside the other workload properties:

```yaml
workloads:
  - id: team-athena
    name: "Athena"
    icon: rocket
    color: "#0369a1"
    codeManagement:
      type: github
      serverId: example-github
      projectName: athena
      repoGroups:
        backend:
          components:
            - repo: example-api
            - repo: another-api
        frontend:
          components:
            - repo: customer-web
            - repo: admin-web
    codeAnalysis:
      type: sonar
      serverId: example-sonar
    pipelines:
      type: github
      serverId: example-github
      projectName: athena
      jobGroups:
        all:
          jobs:
            - name: /.+/
    projectManagement:
      type: jira
      serverId: example-jira
      project: ATH
```
