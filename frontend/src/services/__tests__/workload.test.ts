import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkloadDetails, getWorkloadPipelineFilters } from "@/services/workload";
import { getConfig, listWorkloads } from "@/config";
import type { WorkloadInfo } from "@/model/config";
import { chooseColour } from "@/utils/colours";

vi.mock("@/config", () => ({
  getConfig: vi.fn(),
  listWorkloads: vi.fn(() => []),
}));

describe("workload service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWorkloadDetails", () => {
    beforeEach(() => {
      vi.mocked(getConfig).mockReturnValue({
        systemConfig: {
          branches: [],
          issuePriorities: [],
          tags: {},
          workloads: [],
        },
        webConfig: {} as never,
      });
    });

    it("returns the workload's configured icon and color", () => {
      vi.mocked(listWorkloads).mockReturnValue([
        { id: "athena", name: "Athena", icon: "rocket", color: "#0369a1" },
      ] as WorkloadInfo[]);

      const details = getWorkloadDetails();

      expect(details).toHaveLength(1);
      expect(details[0].id).toBe("athena");
      expect(details[0].name).toBe("Athena");
      expect(details[0].icon).toBe("rocket");
      expect(details[0].color).toBe("#0369a1");
    });

    it("falls back to a palette color and no icon when not configured", () => {
      vi.mocked(listWorkloads).mockReturnValue([{ id: "athena", name: "Athena" }] as WorkloadInfo[]);

      const details = getWorkloadDetails();

      expect(details[0].icon).toBeUndefined();
      expect(details[0].color).toBe(chooseColour(0));
    });
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
