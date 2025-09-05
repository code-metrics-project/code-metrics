import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getWorkloadById } from "../../config/configMapping";

export const LEGACY_FIRST_STAGE_ID = "first-stage";

export const META_FIRST_STAGE_ID = "_first";
export const META_LAST_STAGE_ID = "_last";

/**
 * Reify a meta stage ID to a real stage ID.
 * @param stageId
 * @param workload
 */
export const reifyMetaStageId = (stageId: string, workload: Workload | WorkloadId): string => {
  switch (stageId) {
    case META_FIRST_STAGE_ID:
      return getIdOfFirstStage(workload);
    case META_LAST_STAGE_ID:
      return getIdOfFinalStage(workload);
    default:
      return stageId;
  }
};

/**
 * Get the ID of the first stage in a workload's pipeline.
 * @param workload
 */
export const getIdOfFirstStage = (workload: Workload | WorkloadId): string => {
  if (typeof workload === "string") {
    workload = getWorkloadById(workload);
  }
  const stages = workload.pipelines.stages;
  if (!stages?.length) {
    throw new Error(`No pipeline stages set for workload: ${workload.id}`);
  }
  return stages[0].stageId;
};

/**
 * Get the ID of the final stage in a workload's pipeline.
 * @param workload
 */
export const getIdOfFinalStage = (workload: Workload | WorkloadId): string => {
  if (typeof workload === "string") {
    workload = getWorkloadById(workload);
  }
  const stages = workload.pipelines.stages;
  if (!stages?.length) {
    throw new Error(`No pipeline stages set for workload: ${workload.id}`);
  }
  return stages[stages.length - 1].stageId;
};
