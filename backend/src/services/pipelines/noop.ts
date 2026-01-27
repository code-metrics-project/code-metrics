import { AbstractPipelinesService, PipelinesServiceJobNameFilter, registerPipelines } from "./pipelinesService";
import { Run, RunWithMetadata } from "../../model/runs";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { PipelinesTypes } from "../../model/config/common";

export const initNoOpPipelines = () =>
  registerPipelines(PipelinesTypes.NONE, (stage) => new NoOpPipelineService(stage));

class NoOpPipelineService extends AbstractPipelinesService {
  /* eslint-disable */

  discoverJobNames = async (workload: Workload, filter: PipelinesServiceJobNameFilter): Promise<string[]> => {
    return [];
  };

  getPipelineRunProperty = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> => {
    return null;
  };

  getRunsForProject = async (
    workloadId: string,
    jobNames: string[],
    vcsProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> => {
    return [];
  };

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => "";

  getRunById = (workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> =>
    Promise.resolve(null);
}
