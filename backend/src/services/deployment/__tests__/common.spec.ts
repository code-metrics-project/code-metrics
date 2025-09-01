import { META_FIRST_STAGE_ID, META_LAST_STAGE_ID, reifyMetaStageId } from "../common";
import { Workload } from "../../../model/config/workload-config";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { loadConfig } from "../../../config/config";
import { ConfigVersion } from "../../../model/config/base";

describe("reifyMetaStageId", () => {
  const workload: Workload = {
    id: "workload1",
    pipelines: {
      stages: [
        {
          stageId: "stage1",
        },
        {
          stageId: "stage2",
        },
        {
          stageId: "stage3",
        },
      ],
    },
    codeAnalysis: undefined,
    codeManagement: undefined,
    projectManagement: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      tableName: undefined,
    },
    incidents: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      tableName: undefined,
    },
  };
  const emptyWorkload: Workload = {
    id: "workload2",
    codeAnalysis: undefined,
    codeManagement: undefined,
    pipelines: {
      stages: [],
    },
    projectManagement: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      tableName: undefined,
    },
    incidents: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      tableName: undefined,
    },
  };

  beforeAll(async () => {
    await loadConfig({
      remoteConfig: {
        version: ConfigVersion.V2_0,
        codeManagement: {
          github: {
            servers: [],
          },
        },
        pipelines: {
          github: {
            servers: [],
          },
        },
        codeAnalysis: {},
        ticketManagement: {},
      },
      workloadConfig: {
        version: ConfigVersion.V2_0,
        workloads: [workload, emptyWorkload],
      },
      pipelineConfig: {
        stages: [
          {
            id: "build-stage",
            description: "build stage",
            type: PipelinesTypes.GITHUB,
            serverId: "test-github",
            projectName: "octo-org",
            commitMapping: {
              runProperty: "$.data.head_sha",
            },
          },
        ],
      },
    });
  });

  it("returns the first stage ID when stageId is META_FIRST_STAGE_ID", () => {
    const result = reifyMetaStageId(META_FIRST_STAGE_ID, workload);
    expect(result).toBe("stage1");
  });

  it("returns the last stage ID when stageId is META_LAST_STAGE_ID", () => {
    const result = reifyMetaStageId(META_LAST_STAGE_ID, workload);
    expect(result).toBe("stage3");
  });

  it("returns the original stage ID when stageId is neither META_FIRST_STAGE_ID nor META_LAST_STAGE_ID", () => {
    const result = reifyMetaStageId("stage2", workload);
    expect(result).toBe("stage2");
  });

  it("throws an error when workload has no stages", () => {
    expect(() => reifyMetaStageId(META_FIRST_STAGE_ID, emptyWorkload)).toThrow(
      "No pipeline stages set for workload: workload2",
    );
  });

  it("handles workload ID correctly", () => {
    const result = reifyMetaStageId(META_FIRST_STAGE_ID, "workload1");
    expect(result).toBe("stage1");
  });
});
