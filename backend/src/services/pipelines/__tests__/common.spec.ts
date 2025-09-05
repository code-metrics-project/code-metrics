import { getPipelineStage } from "../common";
import { mapJobNameUsingStageConfig } from "../common";
import { Workload } from "../../../model/config/workload-config";

describe("getPipelineStage", () => {
  const stageId = "stage-1";
  const mockWorkload: Workload = {
    id: "workloadId",
    pipelines: {
      stages: [
        { stageId: "stage-1", jobMapping: {} },
        { stageId: "stage-2", jobMapping: {} },
      ],
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns the correct pipeline stage for a given workload and stage ID", () => {
    const result = getPipelineStage(mockWorkload, stageId);
    expect(result).toEqual(mockWorkload.pipelines.stages[0]);
  });

  it("throws an error if the stage ID is not found in the workload", () => {
    expect(() => getPipelineStage(mockWorkload, "non-existent-stage")).toThrow(
      `No pipeline stage configuration found for workload: ${mockWorkload.id} with stage: non-existent-stage`,
    );
  });
});

describe("mapJobNameUsingStageConfig", () => {
  const stageId = "stage-1";
  const jobName = "job-1";
  const mappedJobName = "mapped-job-1";
  const mockWorkload: Workload = {
    id: "workloadId",
    pipelines: {
      stages: [
        { stageId: "stage-1", jobMapping: { "job-1": "mapped-job-1" } },
        { stageId: "stage-2", jobMapping: {} },
      ],
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns the mapped job name if it exists in the stage configuration", () => {
    const result = mapJobNameUsingStageConfig(mockWorkload, jobName, stageId);
    expect(result).toEqual(mappedJobName);
  });

  it("returns the original job name if it does not exist in the stage configuration", () => {
    const result = mapJobNameUsingStageConfig(mockWorkload, "non-existent-job", stageId);
    expect(result).toEqual("non-existent-job");
  });

  it("throws an error if the stage ID is not found in the workload", () => {
    expect(() => mapJobNameUsingStageConfig(mockWorkload, jobName, "non-existent-stage")).toThrow(
      `No pipeline stage configuration found for workload: ${mockWorkload.id} with stage: non-existent-stage`,
    );
  });
});
