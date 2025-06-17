# Custom queries

Custom queries are combinations of query types and default inputs that you can use to tailor the tool to a particular analysis, workload or repository. You can define custom queries using a JSON file.

## Queries files

Queries are held in files named `queries-<collection name>.json`.

To customise the queries copy the file `queries-example.json` and name it `queries-<collection name>.json`.

> The path to the directory containing this file is set by the environment variable `CONFIG_DIR`. It defaults to the directory containing the `backend` component, such as `/backend` in the Docker container.

## Format

The basic format of the entries in the queries file is:

```js
{
  "categoryName": [
    // array of queries here
  ]
}
```

A query item looks like this:

- **name**: short user-friendly name
- **description**: longer user friendly text
- **component**: the type of component (supported: `dynamic-input`, `code-analysis-metric-summary`, `file-metric-breakdown`)
- **props**: the properties for the component

> Note that `props` is dynamic - so, arbitrary properties can be passed through from the config as long as they are supported by the component.

For example:

```json
{
  "name": "Team Bugs vs. Coverage",
  "description": "Correlates bugs vs. coverage for my team's repositories.",
  "component": "dynamic-input",
  "props": {
    "queryTypes": ["bugs-new", "code-coverage"],
    "defaultInputs": {
      "workloads": ["my-team"]
    }
  }
}
```
