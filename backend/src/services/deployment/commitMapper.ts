import { verbose } from "../../utils/logger/logger";
import { Run } from "../../model/runs";
import { getDeploymentPipelineProvider } from "./deploymentService";
import { Workload } from "../../model/config/workload-config";
import { StageConfig } from "../../model/config/pipeline-config";

export const mapCommitUsingRunProperty = async (workload: Workload, stageId: string, stage: StageConfig, run: Run) => {
  verbose(`Getting commit ID for ${workload.id} run ${run.job} from property ${stage.commitMapping.runProperty}`);
  const deploymentPipeline = getDeploymentPipelineProvider(workload.id, stage);
  return await deploymentPipeline.getPipelineRunProperty(
    workload.id,
    stage.projectName,
    run.job,
    run.id,
    stage.commitMapping.runProperty,
  );
};
