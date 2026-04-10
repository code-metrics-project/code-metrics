import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkloadPipelineFilters } from "@/services/workload";
import { getConfig } from "@/config";

vi.mock("@/config", () => ({
  getConfig: vi.fn(),
  listWorkloads: vi.fn(() => []),
}));

describe("workload service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkloadPipelineFilters", () => {
    it("returns sorted job groups and unique sorted job names for a workload", () => {
      vi.mocked(getConfig).mockReturnValue({
        systemConfig: {
          branches: [],
          issuePriorities: [],
          tags: {},
          workloads: [
            {
              id: "gaia",
              name: "Gaia",
              repos: {},
              jobs: {
                platform: ["Platform", "CI"],
                backend: ["CI", "Build"],
              },
              pipelineStages: [],
            },
          ],
        },
        webConfig: {} as never,
      });

      const result = getWorkloadPipelineFilters("gaia");

      expect(result).toEqual({
        jobGroups: ["backend", "platform"],
        jobNames: ["Build", "CI", "Platform"],
      });
    });

    it("returns empty filters when workload is missing", () => {
      vi.mocked(getConfig).mockReturnValue({
        systemConfig: {
          branches: [],
          issuePriorities: [],
          tags: {},
          workloads: [],
        },
        webConfig: {} as never,
      });

      const result = getWorkloadPipelineFilters("unknown");

      expect(result).toEqual({
        jobGroups: [],
        jobNames: [],
      });
    });

    it("returns empty filters when jobs are not defined", () => {
      vi.mocked(getConfig).mockReturnValue({
        systemConfig: {
          branches: [],
          issuePriorities: [],
          tags: {},
          workloads: [
            {
              id: "gaia",
              name: "Gaia",
              repos: {},
              jobs: {},
              pipelineStages: [],
            },
          ],
        },
        webConfig: {} as never,
      });

      const result = getWorkloadPipelineFilters("gaia");

      expect(result).toEqual({
        jobGroups: [],
        jobNames: [],
      });
    });
  });
});
