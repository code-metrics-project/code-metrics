import client from "@/api/client";
import { PIPELINE_DEPLOYMENTS, PIPELINE_RUN, PIPELINE_RUNS } from "@/api/endpoints";
import { truncateDateOnly } from "@/utils/date";
import { RunResult, type RunWithMetadata } from "@/model/runs";

export type { RunWithMetadata } from "@/model/runs";

export interface RunRow {
  workloadId: string;
  stageId: string;
  job: string;
  id: string;
  jobGroup: string;
  key: string;
  title: string;
  result: RunResult;
  date: string;
  repo: string;
  duration: number;
}

export function convertRunToRow(runItem: RunWithMetadata): RunRow {
  return {
    ...runItem,
    ...runItem.run,
    date: runItem.run.startDate,
    key: `${runItem.run.job}_${runItem.run.id}`,
    title: `${runItem.run.job} / #${runItem.run.id}`,
  };
}

export async function fetchForDateRange(
  workloads: string[],
  stageId: string,
  jobGroups: string[],
  branch: string,
  startDate: Date,
  endDate: Date
): Promise<RunRow[]> {
  const response = await client.get<RunWithMetadata[]>(PIPELINE_RUNS, {
    params: {
      workloads: workloads.join(","),
      stageId,
      jobGroups: jobGroups.join(","),
      branch,
      startDate: truncateDateOnly(startDate),
      endDate: truncateDateOnly(endDate),
    },
  });

  const json: RunWithMetadata[] = response.data;

  const runs = json.map((runItem) => {
    return convertRunToRow(runItem);
  });
  console.log(`${runs.length} runs from ${startDate.toISOString()} to ${endDate.toISOString()}`, runs);
  return runs;
}

export async function fetchRunById(
  workloadId: string,
  stageId: string,
  jobName: string,
  runId: string
): Promise<RunWithMetadata> {
  const response = await client.get<RunWithMetadata>(PIPELINE_RUN, {
    params: {
      workloadId,
      stageId,
      jobName,
      runId,
    },
  });
  const run = response.data;
  console.log(`Fetched ${workloadId} run ${jobName} / #${runId}`, run);
  return run;
}

export async function lookupDeploymentRuns(input: RunWithMetadata): Promise<RunWithMetadata[]> {
  const response = await client.get<RunWithMetadata[]>(PIPELINE_DEPLOYMENTS, {
    params: {
      workloadId: input.workloadId,
      stageId: input.stageId,
      jobName: input.run.job,
      runId: input.run.id,
    },
  });
  const deployments = response.data;
  console.log(`Fetched ${deployments.length} deployments for run ${input.run.job} / #${input.run.id}`, deployments);
  return deployments;
}
