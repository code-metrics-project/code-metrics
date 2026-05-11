import { resolveJobGroupForGitHub } from "../github";
import { warn } from "../../../utils/logger/logger";

jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
}));

// Prevent initGithubPipelines from being called at import time
jest.mock("../../../config/configMapping", () => ({
  getAllPipelinesConfig: jest.fn(() => ({})),
  getWorkloadById: jest.fn(),
}));

describe("resolveJobGroupForGitHub", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve legacy jobNames as workflow name filters across all repos", () => {
    const result = resolveJobGroupForGitHub({ jobNames: ["CI", "Deploy"] });

    expect(result).toEqual([
      { repos: null, workflowNamePattern: "CI", exclude: false },
      { repos: null, workflowNamePattern: "Deploy", exclude: false },
    ]);
  });

  it("should resolve name spec as workflow name filter across all repos", () => {
    const result = resolveJobGroupForGitHub({ jobs: [{ name: "CI" }] });

    expect(result).toEqual([{ repos: null, workflowNamePattern: "CI", exclude: false }]);
  });

  it("should resolve fromRepoGroup spec as repo-scoped fetch with no workflow name filter", () => {
    const workload = {
      id: "test-workload",
      codeManagement: {
        repoGroups: {
          backend: {
            components: [
              { name: "api1", repo: "api1-repo" },
              { name: "api2", repo: "api2-repo" },
            ],
          },
        },
      },
    } as any;

    const result = resolveJobGroupForGitHub({ jobs: [{ fromRepoGroup: "backend" }] }, workload);

    expect(result).toEqual([
      { repos: ["api1-repo", "api2-repo"], workflowNamePattern: undefined, exclude: false },
    ]);
  });

  it("should resolve repo spec as single-repo fetch", () => {
    const result = resolveJobGroupForGitHub({ jobs: [{ repo: "hello-world" }] });

    expect(result).toEqual([{ repos: ["hello-world"], workflowNamePattern: undefined, exclude: false }]);
  });

  it("should resolve repo + name spec as single-repo fetch with workflow name filter", () => {
    const result = resolveJobGroupForGitHub({ jobs: [{ repo: "hello-world", name: "CI" }] });

    expect(result).toEqual([{ repos: ["hello-world"], workflowNamePattern: "CI", exclude: false }]);
  });

  it("should resolve componentName spec to the matching repo", () => {
    const workload = {
      id: "test-workload",
      codeManagement: {
        repoGroups: {
          backend: {
            components: [{ name: "my-api", repo: "my-api-repo" }],
          },
        },
      },
    } as any;

    const result = resolveJobGroupForGitHub({ jobs: [{ componentName: "my-api" }] }, workload);

    expect(result).toEqual([{ repos: ["my-api-repo"], workflowNamePattern: undefined, exclude: false }]);
  });

  it("should set exclude: true when exclude flag is set on a name spec", () => {
    const result = resolveJobGroupForGitHub({
      jobs: [
        { name: "/.+/" },
        { name: "Dependabot Updates", exclude: true },
      ],
    });

    expect(result).toEqual([
      { repos: null, workflowNamePattern: "/.+/", exclude: false },
      { repos: null, workflowNamePattern: "Dependabot Updates", exclude: true },
    ]);
  });

  it("should set exclude: true on a fromRepoGroup spec", () => {
    const workload = {
      id: "test-workload",
      codeManagement: {
        repoGroups: {
          bots: { components: [{ name: "dependabot", repo: "dependabot" }] },
        },
      },
    } as any;

    const result = resolveJobGroupForGitHub(
      { jobs: [{ name: "/.+/" }, { fromRepoGroup: "bots", exclude: true }] },
      workload,
    );

    expect(result).toEqual([
      { repos: null, workflowNamePattern: "/.+/", exclude: false },
      { repos: ["dependabot"], workflowNamePattern: undefined, exclude: true },
    ]);
  });

  it("should omit spec and log warning when fromRepoGroup references unknown group", () => {
    const mockWarn = warn as jest.MockedFunction<typeof warn>;
    const workload = {
      id: "test-workload",
      codeManagement: { repoGroups: {} },
    } as any;

    const result = resolveJobGroupForGitHub({ jobs: [{ fromRepoGroup: "non-existent" }] }, workload);

    expect(result).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining("non-existent"));
  });

  it("should omit spec and log warning when componentName cannot be resolved", () => {
    const mockWarn = warn as jest.MockedFunction<typeof warn>;
    const workload = {
      id: "test-workload",
      codeManagement: { repoGroups: {} },
    } as any;

    const result = resolveJobGroupForGitHub({ jobs: [{ componentName: "ghost-component" }] }, workload);

    expect(result).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining("ghost-component"));
  });

  it("should merge legacy jobNames and new jobs format", () => {
    const result = resolveJobGroupForGitHub({
      jobNames: ["CI"],
      jobs: [{ name: "Deploy" }, { name: "Dependabot Updates", exclude: true }],
    });

    expect(result).toEqual([
      { repos: null, workflowNamePattern: "CI", exclude: false },
      { repos: null, workflowNamePattern: "Deploy", exclude: false },
      { repos: null, workflowNamePattern: "Dependabot Updates", exclude: true },
    ]);
  });

  it("should return empty array for empty job group", () => {
    const result = resolveJobGroupForGitHub({});
    expect(result).toEqual([]);
  });
});
