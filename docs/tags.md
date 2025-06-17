# Tags

You can add tags to workloads to allow you to group them in ways that make sense for you. For example, you might add a 'department' tag to group workloads together.

You can use tags to help you explore your workloads in two ways:

- **Filtering**: You can filter workloads by tags to see only the workloads that are relevant to you.
- **Grouping**: You can group your query results using tags to see how they are distributed across different categories.

## Adding tags to a workload

To add tags to a workload, use the `tags` field in the [workload configuration](./config_workloads.md):

```yaml
workloads:
  - id: athena
    tags:
      department: sales
      country: UK
    # ... other workload config

  - id: gaia
    tags:
      department: finance
      country: UK
    # ... other workload config
```

## Filtering workloads by tags

You can filter workloads by tags using the `tags` field in the workload query:

<img src="/docs/img/query_add_tag.png" alt="Adding a tag" width="384em"/>

For example, to filter workloads by the `department` tag:

<img src="/docs/img/query_single_tag.png" alt="Filtering by a single tag" width="380em"/>

The possible values for the tag will be displayed in the dropdown menu.

You can also filter workloads that match one of multiple tags:

<img src="/docs/img/query_multi_tag.png" alt="Filtering by multiple tags" width="374em"/>

## Grouping workloads by tags

You can group your query results by tags using the `tags` field in the workload grouping menu:

<img src="/docs/img/query_group_tag.png" alt="Grouping by a tag" width="790em"/>

Set the tag to group by:

<img src="/docs/img/query_group_tag_value.png" alt="Setting the tag to group by" width="816em"/>

Query results for each workload will be aggregated by the tag value (in this example, by `pod`).
