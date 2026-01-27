import {
  getAllJobNamesFromRaw,
  lookupJobGroupForJobName,
  listNormalisedJobGroupsForWorkload,
  filterJobsByJobGroup,
} from "../jobs";
import { determineJobGroups, determineJobNames, getWorkloadById } from "../../config/configMapping";

// Mock the config mapping module
jest.mock("../../config/configMapping");

// Mock the logger module
jest.mock("../logger/logger", () => ({
  logger: jest.fn(),
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
  });
});
