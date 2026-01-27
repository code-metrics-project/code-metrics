import { loadConfig } from "../config";
import {
  determineJobGroups,
  determineJobNames,
  getVcsBranches,
  getWorkloadsWithTags,
  listAllTagPairs,
  getAllCodeManagementUrls,
} from "../configMapping";
import { getComponentPatternsByGroup } from "../../utils/repos";
import {
  CodeAnalysisTypes,
  CodeManagementTypes,
  PipelinesTypes,
  TicketManagementTypes,
} from "../../model/config/common";
import { initDatastore } from "../../db/factory";
import { initGithubPipelines } from "../../services/pipelines/github";
import { JobNameMapping, Workload } from "../../model/config/workload-config";
import { ConfigVersion } from "../../model/config/base";
import { initSonar } from "../../services/codeAnalysis/sonar";
import { initAdoVcs } from "../../services/codeManagement/azure";
import { initAdoPipelines } from "../../services/pipelines/azure";
import { initGithubVcs } from "../../services/codeManagement/github";
import * as pipelinesService from "../../services/pipelines/pipelinesService";

// stub out unneeded imports
jest.mock("node-fetch", () => ({}));
// import { Octokit } from "@octokit/rest";

beforeEach(() => {
  jest.resetModules();
});

const workloads = [
  {
    id: "workload-fe-1",
    tags: {
      country: "GB",
      department: "sales",
    },
    codeAnalysis: {
      type: CodeAnalysisTypes.SONAR,
      serverId: "test-sonar-1",
    },
    codeManagement: {
      type: CodeManagementTypes.AZURE,
      serverId: "test-azure-1",
      repoGroups: {
        frontend: {
          sonarTags: ["fe"],
        },
        platform: {
          components: [{ name: "cloud-config", repo: "cloud-config" }],
        },
      },
      projectName: "myTestFrontendProject",
    },
    projectManagement: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Bug"],
      projectName: "PROJ",
    },
    incidents: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Incident"],
      projectName: "PROJ",
    },
    pipelines: {
      stages: [{ stageId: "azure-build-stage" }],
    },
    qualityGates: undefined,
  },
  {
    id: "workload-fe-2",
    tags: {
      country: "GB",
      department: "marketing",
    },
    codeAnalysis: {
      type: CodeAnalysisTypes.SONAR,
      serverId: "test-sonar-1",
    },
    codeManagement: {
      type: CodeManagementTypes.AZURE,
      serverId: "test-azure-1",
      repoGroups: {
        frontend: {
          sonarTags: ["fe"],
        },
        platform: {
          components: [{ name: "/.*infra/", repo: "/.*infra/" }],
        },
      },
      projectName: "myOtherTestFrontendProject",
    },
    projectManagement: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Bug"],
      projectName: "PROJ",
    },
    incidents: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Bug"],
      projectName: "PROJ",
    },
    pipelines: {
      stages: [{ stageId: "azure-build-stage" }],
    },
    qualityGates: undefined,
  },
  {
    id: "workload-be",
    tags: {
      country: "US",
      department: "finance",
    },
    codeAnalysis: {
      type: CodeAnalysisTypes.SONAR,
      serverId: "test-sonar-2",
    },
    codeManagement: {
      type: CodeManagementTypes.AZURE,
      serverId: "test-azure-2",
      repoGroups: {
        backend: {
          sonarTags: ["be"],
        },
      },
      projectName: "myTestBackendProject",
    },
    projectManagement: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Bug"],
      projectName: "PROJ",
    },
    incidents: {
      type: TicketManagementTypes.JIRA,
      serverId: "test-jira",
      ticketPriorities: [],
      ticketTypes: ["Bug"],
      projectName: "PROJ",
    },
    pipelines: {
      stages: [{ stageId: "azure-build-stage" }],
    },
    qualityGates: undefined,
  },
  {
    id: "example",
    pipelines: {
      stages: [{ stageId: "github-build-stage" }],
      jobNameMapping: JobNameMapping.None,
      jobGroups: {
        backend: {
          jobNames: ["api"],
        },
        frontend: {
          jobNames: ["web"],
        },
      },
    },
    codeManagement: {
      type: CodeManagementTypes.GITHUB,
      serverId: "test-github",
      projectName: "test-project",
      repoGroups: {},
    },
    projectManagement: undefined,
    incidents: undefined,
    codeAnalysis: undefined,
    qualityGates: undefined,
  },
];

beforeAll(async () => {
  await initDatastore();
  initAdoVcs();
  initAdoPipelines();
  initGithubVcs();
  initGithubPipelines();
  initSonar();

  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeAnalysis: {
        sonar: {
          servers: [],
        },
      },
      codeManagement: {
        azure: {
          servers: [
            {
              apiKey: "opensesame",
              branches: ["main"],
              id: "test-azure-1",
            },
            {
              apiKey: "opensesame",
              branches: ["main", "develop"],
              id: "test-azure-2",
            },
          ],
        },
        github: {
          servers: [
            {
              apiKey: "gh-token",
              branches: ["main"],
              id: "test-github",
            },
          ],
        },
      },
      pipelines: undefined,
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: workloads,
    },
    pipelineConfig: {
      stages: [
        {
          id: "azure-build-stage",
          description: "Azure build stage",
          type: PipelinesTypes.AZURE,
          serverId: "azure",
          projectName: "proj",
          commitMapping: {
            runProperty: "$.CommitHash",
          },
        },
        {
          id: "github-build-stage",
          description: "GitHub build stage",
          type: PipelinesTypes.GITHUB,
          serverId: "example",
          projectName: "octo-org",
          commitMapping: {
            runProperty: "$.data.head_sha",
          },
        },
      ],
    },
  });
});

describe("config mapping", () => {
  it("builds component patterns that match repo names", () => {
    const patterns = getComponentPatternsByGroup("platform");
    expect(patterns).toHaveLength(2);

    // exact match
    expect(patterns.find((p) => p.pattern.source === "^cloud-config$")).toBeTruthy();

    // wildcard match
    expect(patterns.find((p) => p.pattern.source === ".*infra")).toBeTruthy();
  });

  it("provides a unique and sorted VCS branch list", () => {
    const branches = getVcsBranches();
    expect(branches).toHaveLength(2);
    expect(branches[0]).toBe("develop");
    expect(branches[1]).toBe("main");
  });

  it("should use specific job groups", () => {
    const workload: Workload = {
      id: "example",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: undefined,
        jobGroups: {},
      },
      codeManagement: undefined,
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: undefined,
      qualityGates: undefined,
    };
    const result = determineJobGroups(workload, ["mobile"]);
    expect(result).toStrictEqual(["mobile"]);
  });

  it("should use job groups from config", () => {
    const workload: Workload = {
      id: "example",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: undefined,
        jobGroups: {
          backend: {
            jobNames: [],
          },
          frontend: {
            jobNames: [],
          },
        },
      },
      codeManagement: undefined,
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: undefined,
      qualityGates: undefined,
    };
    const result = determineJobGroups(workload, []);
    expect(result).toStrictEqual(["backend", "frontend"]);
  });

  it("should use repo groups as job groups", () => {
    const workload: Workload = {
      id: "example",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: JobNameMapping.RepoName,
        jobGroups: undefined,
      },
      codeManagement: {
        type: CodeManagementTypes.GITHUB,
        serverId: "example",
        projectName: "octo-org",
        repoGroups: {
          backend: {
            components: [{ name: "api", repo: "api" }],
          },
          frontend: {
            components: [{ name: "web", repo: "web" }],
          },
        },
      },
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: undefined,
      qualityGates: undefined,
    };
    const result = determineJobGroups(workload, []);
    expect(result).toStrictEqual(["backend", "frontend"]);
  });

  it("should return job names for a group", async () => {
    // Mock pipelines service to return job names directly
    const mockPipelinesService = {
      discoverJobNames: jest.fn().mockResolvedValue(["api"]),
    };
    jest.spyOn(pipelinesService, "getPipelinesForWorkload").mockReturnValue(mockPipelinesService as any);

    const exampleWorkload = workloads.find((w) => w.id === "example")!;
    const result = await determineJobNames(exampleWorkload, "backend");
    expect(result).toStrictEqual(["api"]);
  });

  it("should return empty array for nonexistent job group", async () => {
    // Mock pipelines service to return empty array
    const mockPipelinesService = {
      discoverJobNames: jest.fn().mockResolvedValue([]),
    };
    jest.spyOn(pipelinesService, "getPipelinesForWorkload").mockReturnValue(mockPipelinesService as any);

    const workload: Workload = {
      id: "example",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: JobNameMapping.None,
        jobGroups: {},
      },
      codeManagement: {
        type: CodeManagementTypes.GITHUB,
        serverId: "test-github",
        projectName: "test-project",
        repoGroups: {},
      },
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: undefined,
      qualityGates: undefined,
    };
    const result = await determineJobNames(workload, "no-such-group");
    expect(result).toStrictEqual([]);
  });

  // TODO implement this, but need to mock VCS provider
  xit("should return job names using repo names", async () => {
    const workload: Workload = {
      id: "workload-fe-1",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: JobNameMapping.RepoName,
        jobGroups: {},
      },
      codeManagement: undefined,
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: {
        type: CodeAnalysisTypes.SONAR,
        serverId: "test-sonar-1",
      },
      qualityGates: undefined,
    };
    const result = await determineJobNames(workload, "platform");
    expect(result).toStrictEqual(["cloud-config"]);
  });

  // TODO implement this, but need to mock VCS provider
  xit("should return job names using repo names", async () => {
    const workload: Workload = {
      id: "workload-fe-1",
      pipelines: {
        stages: [{ stageId: "github-build-stage" }],
        jobNameMapping: JobNameMapping.ComponentName,
        jobGroups: {},
      },
      codeManagement: undefined,
      projectManagement: undefined,
      incidents: undefined,
      codeAnalysis: {
        type: CodeAnalysisTypes.SONAR,
        serverId: "test-sonar-1",
      },
      qualityGates: undefined,
    };
    const result = await determineJobNames(workload, "platform");
    expect(result).toStrictEqual(["cloud-config"]);
  });

  it("should return workload IDs containing the given tag", () => {
    expect(getWorkloadsWithTags([{ key: "country", value: "GB" }])).toStrictEqual(["workload-fe-1", "workload-fe-2"]);
    expect(getWorkloadsWithTags([{ key: "department", value: "sales" }])).toStrictEqual(["workload-fe-1"]);
  });

  it("should return workload IDs containing all tag values", () => {
    expect(
      getWorkloadsWithTags([
        { key: "country", value: "GB" },
        { key: "country", value: "US" },
      ]),
    ).toStrictEqual(["workload-fe-1", "workload-fe-2", "workload-be"]);
  });

  it("should return an empty array when no workloads match the tag", () => {
    expect(getWorkloadsWithTags([{ key: "country", value: "notmatching" }])).toHaveLength(0);
    expect(getWorkloadsWithTags([{ key: "nosuchkey", value: "foo" }])).toHaveLength(0);
  });

  it("returns unique tag pairs across all workloads", () => {
    const result = listAllTagPairs();
    expect(result).toStrictEqual({
      country: ["GB", "US"],
      department: ["sales", "marketing", "finance"],
    });
  });

  it("converts GitHub API URLs to web URLs for commit and PR links", () => {
    const urls = getAllCodeManagementUrls();

    // Check that GitHub workload URLs don't contain 'api.github.com'
    Object.entries(urls).forEach(([workloadId, url]) => {
      expect(url).not.toContain("api.github.com");
      if (url.includes("github")) {
        // Ensure it's using the web URL format
        expect(url).toMatch(/^https:\/\/github\.com\//);
      }
    });
  });
});
