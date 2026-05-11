import {
  getAllJobNamesFromRaw,
  lookupJobGroupForJobName,
  listNormalisedJobGroupsForWorkload,
  filterJobsByJobGroup,
  resolveJobGroupPatterns,
} from "../jobs";
import { determineJobGroups, determineJobNames, getWorkloadById } from "../../config/configMapping";
import { warn } from "../logger/logger";

// Mock the config mapping module
jest.mock("../../config/configMapping");

// Mock the logger module
jest.mock("../logger/logger", () => ({
  logger: jest.fn(),
  warn: jest.fn(),
}));

const mockGetWorkloadById = getWorkloadById as jest.MockedFunction<typeof getWorkloadById>;
const mockDetermineJobGroups = determineJobGroups as jest.MockedFunction<typeof determineJobGroups>;
const mockDetermineJobNames = determineJobNames as jest.MockedFunction<typeof determineJobNames>;

describe("jobs", () => {
  describe("getAllJobNamesFromRaw", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should handle undefined jobNames and jobGroups", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {},
        },
      } as any);

      const result = await getAllJobNamesFromRaw(["test-workload"], undefined, undefined);
      
      expect(result).toEqual([]);
    });

    it("should handle empty arrays for jobNames and jobGroups", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {},
        },
      } as any);

      const result = await getAllJobNamesFromRaw(["test-workload"], [], []);
      
      expect(result).toEqual([]);
    });

    it("should handle jobNames as array", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {},
        },
      } as any);

      const result = await getAllJobNamesFromRaw(["test-workload"], undefined, ["job1", "job2"]);
      
      expect(result).toEqual(["job1", "job2"]);
    });

    it("should handle jobNames as comma-separated string", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {},
        },
      } as any);

      const result = await getAllJobNamesFromRaw(["test-workload"], undefined, "job1,job2,job3" as any);
      
      expect(result).toEqual(["job1", "job2", "job3"]);
    });

    it("should handle jobGroups as array", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
          },
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames.mockResolvedValue(["job1", "job2"]);

      const result = await getAllJobNamesFromRaw(["test-workload"], ["group1"], undefined);
      
      expect(result).toEqual(["job1", "job2"]);
    });

    it("should handle jobGroups as comma-separated string", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
            "group2": {
              jobNames: ["job3"],
            },
          },
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["group1", "group2"]);
      mockDetermineJobNames
        .mockResolvedValueOnce(["job1", "job2"])
        .mockResolvedValueOnce(["job3"]);

      const result = await getAllJobNamesFromRaw(["test-workload"], "group1,group2" as any, undefined);
      
      expect(result).toEqual(["job1", "job2", "job3"]);
    });

    it("should combine jobNames and resolved jobGroups", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
          },
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames.mockResolvedValue(["job1", "job2"]);

      const result = await getAllJobNamesFromRaw(["test-workload"], ["group1"], ["job3", "job4"]);
      
      expect(result).toEqual(["job3", "job4", "job1", "job2"]);
    });

    it("should remove duplicates when jobNames overlap with resolved jobGroups", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
          },
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames.mockResolvedValue(["job1", "job2"]);

      const result = await getAllJobNamesFromRaw(["test-workload"], ["group1"], ["job1", "job3"]);
      
      expect(result).toEqual(["job1", "job3", "job2"]);
    });

    it("should handle multiple workloads with jobGroups", async () => {
      mockGetWorkloadById
        .mockReturnValueOnce({
          id: "workload1",
          pipelines: {
            jobGroups: {
              "group1": {
                jobNames: ["job1", "job2"],
              },
            },
          },
        } as any)
        .mockReturnValueOnce({
          id: "workload2",
          pipelines: {
            jobGroups: {
              "group1": {
                jobNames: ["job3", "job4"],
              },
            },
          },
        } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames
        .mockResolvedValueOnce(["job1", "job2"])
        .mockResolvedValueOnce(["job3", "job4"]);

      const result = await getAllJobNamesFromRaw(["workload1", "workload2"], ["group1"], undefined);
      
      expect(result).toEqual(["job1", "job2", "job3", "job4"]);
    });

    it("should handle multiple workloads with same jobNames and remove duplicates", async () => {
      mockGetWorkloadById
        .mockReturnValueOnce({
          id: "workload1",
          pipelines: {
            jobGroups: {
              "group1": {
                jobNames: ["job1", "job2"],
              },
            },
          },
        } as any)
        .mockReturnValueOnce({
          id: "workload2",
          pipelines: {
            jobGroups: {
              "group1": {
                jobNames: ["job2", "job3"],
              },
            },
          },
        } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames
        .mockResolvedValueOnce(["job1", "job2"])
        .mockResolvedValueOnce(["job2", "job3"]);

      const result = await getAllJobNamesFromRaw(["workload1", "workload2"], ["group1"], undefined);
      
      expect(result).toEqual(["job1", "job2", "job3"]);
    });

    it("should handle empty jobGroups gracefully", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {},
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["non-existent-group"]);
      mockDetermineJobNames.mockResolvedValue([]);

      const result = await getAllJobNamesFromRaw(["test-workload"], ["non-existent-group"], undefined);
      
      expect(result).toEqual([]);
    });

    it("should handle mixed input types", async () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobGroups: {
            "group1": {
              jobNames: ["job1"],
            },
          },
        },
      } as any);

      mockDetermineJobGroups.mockReturnValue(["group1"]);
      mockDetermineJobNames.mockResolvedValue(["job1"]);

      const result = await getAllJobNamesFromRaw(
        ["test-workload"],
        "group1" as any,
        "job2,job3" as any
      );
      
      expect(result).toEqual(["job2", "job3", "job1"]);
    });
  });

  describe("listNormalisedJobGroupsForWorkload", () => {
    it("should return jobGroups when jobNameMapping is None", () => {
      const workload = {
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
            "group2": {
              jobNames: ["job3"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any;

      const result = listNormalisedJobGroupsForWorkload(workload);
      
      expect(result).toEqual({
        "group1": {
          jobNames: ["job1", "job2"],
        },
        "group2": {
          jobNames: ["job3"],
        },
      });
    });

    it("should convert repoGroups to jobGroups when jobNameMapping is RepoName", () => {
      const workload = {
        id: "test-workload",
        pipelines: {
          jobNameMapping: "repo-name" as any,
          jobGroups: {},
        },
        codeManagement: {
          repoGroups: {
            "frontend": {
              components: [
                { repo: "web-app" },
                { repo: "mobile-app" },
              ],
            },
            "backend": {
              components: [
                { repo: "api-service" },
              ],
            },
          },
        },
      } as any;

      const result = listNormalisedJobGroupsForWorkload(workload);
      
      expect(result).toEqual({
        "frontend": {
          jobNames: ["web-app", "mobile-app"],
        },
        "backend": {
          jobNames: ["api-service"],
        },
      });
    });

    it("should handle empty components in repoGroups", () => {
      const workload = {
        id: "test-workload",
        pipelines: {
          jobNameMapping: "repo-name" as any,
          jobGroups: {},
        },
        codeManagement: {
          repoGroups: {
            "frontend": {
              components: [],
            },
          },
        },
      } as any;

      const result = listNormalisedJobGroupsForWorkload(workload);
      
      expect(result).toEqual({
        "frontend": {
          jobNames: [],
        },
      });
    });

    it("should handle undefined components in repoGroups", () => {
      const workload = {
        id: "test-workload",
        pipelines: {
          jobNameMapping: "repo-name" as any,
          jobGroups: {},
        },
        codeManagement: {
          repoGroups: {
            "frontend": {},
          },
        },
      } as any;

      const result = listNormalisedJobGroupsForWorkload(workload);
      
      expect(result).toEqual({
        "frontend": {
          jobNames: [],
        },
      });
    });

    it("should return empty object when jobGroups is undefined", () => {
      const workload = {
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any;

      const result = listNormalisedJobGroupsForWorkload(workload);
      
      expect(result).toEqual({});
    });
  });

  describe("lookupJobGroupForJobName", () => {
    it("should find the correct job group for a job name", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
            "group2": {
              jobNames: ["job3"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const result = lookupJobGroupForJobName("test-workload", "job2");
      
      expect(result).toBe("group1");
    });

    it("should return default value when job name is not found", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "group1": {
              jobNames: ["job1", "job2"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const result = lookupJobGroupForJobName("test-workload", "non-existent-job");
      
      expect(result).toBe("unknown");
    });

    it("should return custom default value when job name is not found", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "group1": {
              jobNames: ["job1"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const result = lookupJobGroupForJobName("test-workload", "non-existent-job", "custom-default");
      
      expect(result).toBe("custom-default");
    });

    it("should find the correct job group using the jobs format", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobs: [{ name: "api-service" }, { name: "worker-service" }],
            },
            "frontend": {
              jobs: [{ name: "web-app" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      expect(lookupJobGroupForJobName("test-workload", "worker-service")).toBe("backend");
      expect(lookupJobGroupForJobName("test-workload", "web-app")).toBe("frontend");
    });

    it("should match regex patterns in the jobs format", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobs: [{ name: "/spring-.*/" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      expect(lookupJobGroupForJobName("test-workload", "spring-petclinic")).toBe("backend");
      expect(lookupJobGroupForJobName("test-workload", "other-service")).toBe("unknown");
    });

    it("should respect exclude in the jobs format", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobs: [{ name: "/spring-.*/" }, { name: "spring-legacy", exclude: true }],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      expect(lookupJobGroupForJobName("test-workload", "spring-petclinic")).toBe("backend");
      expect(lookupJobGroupForJobName("test-workload", "spring-legacy")).toBe("unknown");
    });

    it("should resolve fromRepoGroup in the jobs format", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "monorepos": {
              jobs: [{ fromRepoGroup: "monorepos" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {
            monorepos: {
              components: [
                { name: "web-a", repo: "ui-portal" },
                { name: "web-b", repo: "ui-portal" },
              ],
            },
          },
        },
      } as any);

      expect(lookupJobGroupForJobName("test-workload", "ui-portal")).toBe("monorepos");
      expect(lookupJobGroupForJobName("test-workload", "other-repo")).toBe("unknown");
    });

    it("should work with RepoName jobNameMapping", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "repo-name" as any,
          jobGroups: {},
        },
        codeManagement: {
          repoGroups: {
            "backend": {
              components: [
                { repo: "api-service" },
              ],
            },
          },
        },
      } as any);

      const result = lookupJobGroupForJobName("test-workload", "api-service");
      
      expect(result).toBe("backend");
    });
  });

  describe("filterJobsByJobGroup", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should filter jobs using exact string match", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobNames: ["api-service", "worker-service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "worker-service", "frontend-app", "mobile-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");
      
      expect(result).toEqual(["api-service", "worker-service"]);
    });

    it("should filter jobs using regex pattern", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "services": {
              jobNames: [".*-service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "worker-service", "frontend-app", "mobile-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "services");
      
      expect(result).toEqual(["api-service", "worker-service"]);
    });

    it("should return empty array when no jobs match", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobNames: ["api-service", "worker-service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["frontend-app", "mobile-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");
      
      expect(result).toEqual([]);
    });

    it("should return empty array when job group does not exist", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobNames: ["api-service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "frontend-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "non-existent-group");
      
      expect(result).toEqual([]);
    });

    it("should handle empty allJobNames array", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobNames: ["api-service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const result = filterJobsByJobGroup("test-workload", [], "backend");
      
      expect(result).toEqual([]);
    });

    it("should filter using multiple patterns in job group", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "mixed": {
              jobNames: ["api-service", ".*-app"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "worker-service", "frontend-app", "mobile-app", "database"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "mixed");
      
      expect(result).toEqual(["api-service", "frontend-app", "mobile-app"]);
    });

    it("should work with RepoName jobNameMapping", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "repo-name" as any,
          jobGroups: {},
        },
        codeManagement: {
          repoGroups: {
            "backend": {
              components: [
                { repo: "api-service" },
                { repo: "worker-service" },
              ],
            },
          },
        },
      } as any);

      const allJobNames = ["api-service", "worker-service", "frontend-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");
      
      expect(result).toEqual(["api-service", "worker-service"]);
    });

    it("should handle complex regex patterns", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "services": {
              jobNames: ["^(api|worker)-.*"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "api-gateway", "worker-service", "frontend-service", "mobile-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "services");
      
      expect(result).toEqual(["api-service", "api-gateway", "worker-service"]);
    });

    it("should handle case-sensitive matching", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "backend": {
              jobNames: ["API-Service"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "API-Service", "Api-Service"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");
      
      expect(result).toEqual(["API-Service"]);
    });

    it("should not include duplicates in result", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "services": {
              jobNames: ["api-service", "api-.*"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "api-gateway"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "services");
      
      // api-service matches both patterns but should only appear once
      expect(result).toEqual(["api-service", "api-gateway"]);
    });

    it("should handle wildcard patterns", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "all": {
              jobNames: [".*"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api-service", "frontend-app", "mobile-app", "database"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "all");
      
      expect(result).toEqual(["api-service", "frontend-app", "mobile-app", "database"]);
    });

    it("should handle special regex characters in job names", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "special": {
              jobNames: ["job\\[1\\]"],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["job[1]", "job[2]", "job1"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "special");
      
      expect(result).toEqual(["job[1]"]);
    });

    it("should exclude jobs using the new jobs format with exclude flag", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "all": {
              jobs: [
                { name: "/.+/" },
                { name: "Dependabot Updates", exclude: true },
              ],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["CI", "Linter", "Dependabot Updates", "Deploy"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "all");

      expect(result).toEqual(["CI", "Linter", "Deploy"]);
    });

    it("should exclude jobs matching a regex pattern", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "all": {
              jobs: [
                { name: "/.+/" },
                { name: "/Dependabot.*/", exclude: true },
              ],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["CI", "Dependabot Updates", "Dependabot Security"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "all");

      expect(result).toEqual(["CI"]);
    });

    it("should support combining legacy jobNames with new jobs format", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "mixed": {
              jobNames: ["/.+/"],
              jobs: [
                { name: "Dependabot Updates", exclude: true },
              ],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["CI", "Linter", "Dependabot Updates"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "mixed");

      expect(result).toEqual(["CI", "Linter"]);
    });

    it("should apply excludes across all groups when no jobGroup filter specified", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            "group1": {
              jobs: [
                { name: "/.+/" },
                { name: "Dependabot Updates", exclude: true },
              ],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["CI", "Dependabot Updates", "Deploy"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "");

      expect(result).toEqual(["CI", "Deploy"]);
    });

    it("should filter jobs using fromRepoGroup to resolve include patterns", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            backend: {
              jobs: [{ fromRepoGroup: "backend" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {
            backend: {
              components: [
                { repo: "api1", name: "api1" },
                { repo: "api2", name: "api2" },
              ],
            },
          },
        },
      } as any);

      const allJobNames = ["api1", "api2", "frontend-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");

      expect(result).toEqual(["api1", "api2"]);
    });

    it("should exclude jobs using fromRepoGroup as exclude patterns", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            all: {
              jobs: [
                { name: "/.+/" },
                { fromRepoGroup: "bots", exclude: true },
              ],
            },
          },
        },
        codeManagement: {
          repoGroups: {
            bots: {
              components: [{ repo: "dependabot", name: "dependabot" }],
            },
          },
        },
      } as any);

      const allJobNames = ["api1", "api2", "dependabot"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "all");

      expect(result).toEqual(["api1", "api2"]);
    });

    it("should filter jobs using repo to match a specific job name", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            backend: {
              jobs: [{ repo: "api1" }, { repo: "api2" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {},
        },
      } as any);

      const allJobNames = ["api1", "api2", "frontend-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");

      expect(result).toEqual(["api1", "api2"]);
    });

    it("should filter jobs using componentName to resolve repo as job name", () => {
      mockGetWorkloadById.mockReturnValue({
        id: "test-workload",
        pipelines: {
          jobNameMapping: "none" as any,
          jobGroups: {
            backend: {
              jobs: [{ componentName: "api" }],
            },
          },
        },
        codeManagement: {
          repoGroups: {
            backend: {
              components: [
                { name: "api", repo: "api-service" },
                { name: "worker", repo: "worker-service" },
              ],
            },
          },
        },
      } as any);

      const allJobNames = ["api-service", "worker-service", "frontend-app"];
      const result = filterJobsByJobGroup("test-workload", allJobNames, "backend");

      expect(result).toEqual(["api-service"]);
    });
  });

  describe("resolveJobGroupPatterns", () => {
    it("should return include patterns from legacy jobNames", () => {
      const result = resolveJobGroupPatterns({ jobNames: ["CI", "/.*-api/"] });

      expect(result).toEqual({
        includePatterns: ["CI", "/.*-api/"],
        excludePatterns: [],
      });
    });

    it("should return include and exclude patterns from jobs", () => {
      const result = resolveJobGroupPatterns({
        jobs: [
          { name: "/.+/" },
          { name: "Dependabot Updates", exclude: true },
        ],
      });

      expect(result).toEqual({
        includePatterns: ["/.+/"],
        excludePatterns: ["Dependabot Updates"],
      });
    });

    it("should merge legacy jobNames and new jobs format", () => {
      const result = resolveJobGroupPatterns({
        jobNames: ["CI"],
        jobs: [
          { name: "Deploy" },
          { name: "Dependabot Updates", exclude: true },
        ],
      });

      expect(result).toEqual({
        includePatterns: ["CI", "Deploy"],
        excludePatterns: ["Dependabot Updates"],
      });
    });

    it("should return empty arrays when no patterns configured", () => {
      const result = resolveJobGroupPatterns({});

      expect(result).toEqual({
        includePatterns: [],
        excludePatterns: [],
      });
    });

    it("should resolve fromRepoGroup to repo values as include patterns", () => {
      const workload = {
        codeManagement: {
          repoGroups: {
            backend: {
              components: [{ repo: "api1", name: "api1" }, { repo: "api2", name: "api2" }],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        { jobs: [{ fromRepoGroup: "backend" }] },
        workload,
      );

      expect(result).toEqual({
        includePatterns: ["api1", "api2"],
        excludePatterns: [],
      });
    });

    it("should resolve fromRepoGroup to repo values as exclude patterns when exclude is true", () => {
      const workload = {
        codeManagement: {
          repoGroups: {
            backend: {
              components: [{ repo: "api1", name: "api1" }, { repo: "api2", name: "api2" }],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        {
          jobs: [
            { name: "/.+/" },
            { fromRepoGroup: "backend", exclude: true },
          ],
        },
        workload,
      );

      expect(result).toEqual({
        includePatterns: ["/.+/"],
        excludePatterns: ["api1", "api2"],
      });
    });

    it("should return empty patterns and log warning when fromRepoGroup references unknown group", () => {
      const mockWarn = warn as jest.MockedFunction<typeof warn>;
      const workload = {
        id: "test-workload",
        codeManagement: { repoGroups: {} },
      } as any;

      const result = resolveJobGroupPatterns(
        { jobs: [{ fromRepoGroup: "non-existent" }] },
        workload,
      );

      expect(result).toEqual({
        includePatterns: [],
        excludePatterns: [],
      });
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("non-existent"),
      );
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("test-workload"),
      );
    });

    it("should return empty patterns when fromRepoGroup is referenced but workload not provided", () => {
      const result = resolveJobGroupPatterns({ jobs: [{ fromRepoGroup: "backend" }] });

      expect(result).toEqual({
        includePatterns: [],
        excludePatterns: [],
      });
    });

    it("should resolve repo to a single include pattern", () => {
      const result = resolveJobGroupPatterns({
        jobs: [{ repo: "my-api" }],
      });

      expect(result).toEqual({
        includePatterns: ["my-api"],
        excludePatterns: [],
      });
    });

    it("should resolve repo as an exclude pattern when exclude is true", () => {
      const result = resolveJobGroupPatterns({
        jobs: [
          { name: "/.+/" },
          { repo: "my-api", exclude: true },
        ],
      });

      expect(result).toEqual({
        includePatterns: ["/.+/"],
        excludePatterns: ["my-api"],
      });
    });

    it("should resolve componentName to the matching component's repo", () => {
      const workload = {
        codeManagement: {
          repoGroups: {
            backend: {
              components: [
                { name: "api", repo: "my-api-repo" },
                { name: "worker", repo: "my-worker-repo" },
              ],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        { jobs: [{ componentName: "api" }] },
        workload,
      );

      expect(result).toEqual({
        includePatterns: ["my-api-repo"],
        excludePatterns: [],
      });
    });

    it("should resolve componentName as an exclude pattern when exclude is true", () => {
      const workload = {
        codeManagement: {
          repoGroups: {
            backend: {
              components: [
                { name: "api", repo: "my-api-repo" },
              ],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        {
          jobs: [
            { name: "/.+/" },
            { componentName: "api", exclude: true },
          ],
        },
        workload,
      );

      expect(result).toEqual({
        includePatterns: ["/.+/"],
        excludePatterns: ["my-api-repo"],
      });
    });

    it("should return empty patterns and log warning when componentName does not exist", () => {
      const mockWarn = warn as jest.MockedFunction<typeof warn>;
      const workload = {
        id: "test-workload",
        codeManagement: {
          repoGroups: {
            backend: {
              components: [{ name: "api", repo: "my-api" }],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        { jobs: [{ componentName: "non-existent" }] },
        workload,
      );

      expect(result).toEqual({
        includePatterns: [],
        excludePatterns: [],
      });
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("non-existent"),
      );
    });

    it("should find componentName across multiple repo groups", () => {
      const workload = {
        codeManagement: {
          repoGroups: {
            backend: {
              components: [{ name: "api", repo: "api-repo" }],
            },
            frontend: {
              components: [{ name: "web", repo: "web-repo" }],
            },
          },
        },
      } as any;

      const result = resolveJobGroupPatterns(
        { jobs: [{ componentName: "web" }] },
        workload,
      );

      expect(result).toEqual({
        includePatterns: ["web-repo"],
        excludePatterns: [],
      });
    });
  });
});
