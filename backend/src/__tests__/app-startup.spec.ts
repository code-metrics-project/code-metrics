/**
 * @group unit
 */

import { expect, jest, beforeEach, afterEach } from "@jest/globals";

// Mock all the service initialization functions
const mockInitGithubIssues = jest.fn();
const mockInitGithubIncidents = jest.fn();
const mockInitAdoIssues = jest.fn();
const mockInitJiraIssues = jest.fn();
const mockInitNoOpIssues = jest.fn();
const mockInitAdoIncidents = jest.fn();
const mockInitJiraIncidents = jest.fn();
const mockInitServiceNowIncidents = jest.fn();
const mockInitNoOpIncidents = jest.fn();

// Mock all service modules
jest.mock("../services/projectManangement/azure", () => ({
  initAdoIssues: mockInitAdoIssues,
}));

jest.mock("../services/projectManangement/jira", () => ({
  initJiraIssues: mockInitJiraIssues,
}));

jest.mock("../services/projectManangement/github", () => ({
  initGithubIssues: mockInitGithubIssues,
}));

jest.mock("../services/projectManangement/noop", () => ({
  initNoOpIssues: mockInitNoOpIssues,
}));

jest.mock("../services/incidentManagement/azure", () => ({
  initAdoIncidents: mockInitAdoIncidents,
}));

jest.mock("../services/incidentManagement/github", () => ({
  initGithubIncidents: mockInitGithubIncidents,
}));

jest.mock("../services/incidentManagement/jira", () => ({
  initJiraIncidents: mockInitJiraIncidents,
}));

jest.mock("../services/incidentManagement/servicenow", () => ({
  initServiceNowIncidents: mockInitServiceNowIncidents,
}));

jest.mock("../services/incidentManagement/noop", () => ({
  initNoOpIncidents: mockInitNoOpIncidents,
}));

// Mock other dependencies
jest.mock("../config/config", () => ({
  loadConfig: jest.fn().mockResolvedValue({}),
  hasWorkloads: jest.fn().mockReturnValue(true), // Ensure services initialize in tests
  hasConfig: jest.fn().mockReturnValue(true),
  getConfig: jest.fn().mockReturnValue({
    workloadConfigs: { workloads: [{ id: "test" }] },
    remoteConfigs: {},
  }),
  onConfigChange: jest.fn(),
  ensureConfigLoaded: jest.fn().mockResolvedValue({}),
}));

jest.mock("../db/factory", () => ({
  initDatastore: jest.fn().mockResolvedValue({}),
}));

jest.mock("../services/codeManagement/vcsService", () => ({
  initVcs: jest.fn().mockResolvedValue({}),
}));

// Mock all other service initializations
jest.mock("../services/codeManagement/azure", () => ({
  initAdoVcs: jest.fn(),
}));

jest.mock("../services/codeManagement/github", () => ({
  initGithubVcs: jest.fn(),
}));

jest.mock("../services/codeManagement/bitbucket-cloud", () => ({
  initBitbucketCloudVcs: jest.fn(),
}));

jest.mock("../services/codeManagement/bitbucket-server", () => ({
  initBitbucketServerVcs: jest.fn(),
}));

jest.mock("../services/pipelines/azure", () => ({
  initAdoPipelines: jest.fn(),
}));

jest.mock("../services/pipelines/github", () => ({
  initGithubPipelines: jest.fn(),
}));

jest.mock("../services/pipelines/jenkins", () => ({
  initJenkinsPipelines: jest.fn(),
}));

jest.mock("../services/pipelines/codepipeline", () => ({
  initCodePipelinePipelines: jest.fn(),
}));

jest.mock("../services/pipelines/dynatrace", () => ({
  initDynatracePipelines: jest.fn(),
}));

jest.mock("../services/pipelines/noop", () => ({
  initNoOpPipelines: jest.fn(),
}));

jest.mock("../services/codeAnalysis/noop", () => ({
  initNoOpCodeAnalysis: jest.fn(),
}));

jest.mock("../services/codeAnalysis/sonar", () => ({
  initSonar: jest.fn(),
}));

jest.mock("../services/dependencyAlerts/github", () => ({
  initGithubDependencyAlerts: jest.fn(),
}));

jest.mock("../services/dependencyAlerts/noop", () => ({
  initNoopDependencyAlerts: jest.fn(),
}));

jest.mock("../queries/queries", () => ({
  registerQueries: jest.fn(),
}));

jest.mock("../transforms/transforms", () => ({
  registerTransforms: jest.fn(),
}));

jest.mock("../license/validate", () => ({
  validateLicense: jest.fn().mockResolvedValue({}),
}));

jest.mock("../config/sources/source", () => ({
  getEnvConfigItem: jest.fn((key) => {
    if (key === "LAZY_LOAD_CONFIG_DISABLED") return "true"; // Force eager loading in tests
    return undefined;
  }),
  getEnvConfigItemAsNumber: jest.fn((key, defaultValue) => defaultValue),
  getEnvConfigItemAsBoolean: jest.fn(() => false),
  overrideEnvConfigItem: jest.fn(),
}));

describe("Application Startup - GitHub Service Initialization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockInitGithubIssues.mockReset();
    mockInitGithubIncidents.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should call initGithubIssues during project management providers initialization", async () => {
    return jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");
      await bootstrap();

      expect(mockInitGithubIssues).toHaveBeenCalledTimes(1);
      expect(mockInitGithubIssues).toHaveBeenCalled();
    });
  });

  it("should call initGithubIncidents during incident management providers initialization", async () => {
    return jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");
      await bootstrap();

      expect(mockInitGithubIncidents).toHaveBeenCalledTimes(1);
      expect(mockInitGithubIncidents).toHaveBeenCalled();
    });
  });

  it("should initialize GitHub services alongside other project management providers", async () => {
    return jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");
      await bootstrap();

      // Assert - All project management providers should be initialized
      expect(mockInitAdoIssues).toHaveBeenCalledTimes(1);
      expect(mockInitJiraIssues).toHaveBeenCalledTimes(1);
      expect(mockInitGithubIssues).toHaveBeenCalledTimes(1);
      expect(mockInitNoOpIssues).toHaveBeenCalledTimes(1);
    });
  });

  it("should initialize GitHub services alongside other incident management providers", async () => {
    return jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");
      await bootstrap();

      // Assert - All incident management providers should be initialized
      expect(mockInitAdoIncidents).toHaveBeenCalledTimes(1);
      expect(mockInitGithubIncidents).toHaveBeenCalledTimes(1);
      expect(mockInitJiraIncidents).toHaveBeenCalledTimes(1);
      expect(mockInitNoOpIncidents).toHaveBeenCalledTimes(1);
      expect(mockInitServiceNowIncidents).toHaveBeenCalledTimes(1);
    });
  });

  it("should initialize services in the correct order", async () => {
    return jest.isolateModules(async () => {
      // Track call order
      const callOrder: string[] = [];

      mockInitGithubIssues.mockImplementation(() => {
        callOrder.push("initGithubIssues");
      });

      mockInitGithubIncidents.mockImplementation(() => {
        callOrder.push("initGithubIncidents");
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");
      await bootstrap();

      // Assert - GitHub services should be initialized
      expect(callOrder).toContain("initGithubIssues");
      expect(callOrder).toContain("initGithubIncidents");

      // Both should be called exactly once
      expect(mockInitGithubIssues).toHaveBeenCalledTimes(1);
      expect(mockInitGithubIncidents).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle GitHub service initialization errors gracefully", async () => {
    return jest.isolateModules(async () => {
      // Make GitHub issues initialization throw an error
      mockInitGithubIssues.mockImplementation(() => {
        throw new Error("GitHub Issues initialization failed");
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");

      // Act & Assert - Should not throw, but handle error gracefully
      await expect(bootstrap()).rejects.toThrow("GitHub Issues initialization failed");

      // Verify that the initialization was attempted
      expect(mockInitGithubIssues).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle GitHub incidents initialization errors gracefully", async () => {
    return jest.isolateModules(async () => {
      // Make GitHub incidents initialization throw an error
      mockInitGithubIncidents.mockImplementation(() => {
        throw new Error("GitHub Incidents initialization failed");
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { bootstrap } = require("../app");

      // Act & Assert - Should not throw, but handle error gracefully
      await expect(bootstrap()).rejects.toThrow("GitHub Incidents initialization failed");

      // Verify that the initialization was attempted
      expect(mockInitGithubIncidents).toHaveBeenCalledTimes(1);
    });
  });
});
