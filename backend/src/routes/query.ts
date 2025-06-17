import { Request, Response } from "express";
import { RawQuery } from "../model/query";
import { getQueryByName } from "../queries/config";
import { convertMetricsMapToObj } from "../utils/metrics";
import { IntermediaryDatedMetrics, MetricsWireFormat } from "../model/metrics";
import { getTransformByType } from "../transforms/transforms";
import { groupBy } from "../utils/grouping";
import { TagInput } from "../model/queryInputs";
import { getWorkloadsWithTags } from "../config/configMapping";
import uniq from "lodash/uniq";

export const executeQuery = async (
  req: Request,
  res: Response<MetricsWireFormat>,
): Promise<void> => {
  const raw: RawQuery = req.body;
  const query = getQueryByName(raw.queryName);
  try {
    const args = processArgs(raw.args);
    const result = await query.execute(args);
    const grouped = await groupBy(raw, result);
    const transformed = await applyTransforms(raw, grouped);
    const output = convertMetricsMapToObj(transformed);
    res.json(output);
  } catch (e) {
    throw new Error(`Failed to execute query '${raw.queryName}' with args: ${JSON.stringify(raw.args)}: ${e}`);
  }
};

export const processArgs = (
  args: Record<string, any>
): Record<string, any> => {
  const processed = {...args};
  const tags = (args as TagInput).tags;
  if (tags?.length) {
    const workloads: string[] = [
      ...(args.workloads?.length === 1 && args.workloads[0] === "all" ? [] : args.workloads),
      ...getWorkloadsWithTags(tags),
    ];
    processed.workloads = uniq(workloads);
  }
  return processed;
};

export const applyTransforms = async (query: RawQuery, dataset: Map<string, IntermediaryDatedMetrics>) => {
  if (query.transforms) {
    for (const t of query.transforms) {
      const transform = getTransformByType(t.transform);
      dataset = await transform.apply(dataset, t.args);
    }
  }
  return dataset;
};
