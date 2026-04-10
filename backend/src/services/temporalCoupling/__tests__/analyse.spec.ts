import { findTemporalCouplingFromPRs, findTemporalCouplingForComponent } from "../analyse";
import { CompletePrInfo } from "../../../model/vcs";
import { SoftwareComponent } from "../../../model/config/workload-config";

const createMockPR = (id: number, files: string[]): CompletePrInfo => ({
  pr: {
    id,
    workloadId: "test-workload",
    vcsProjectName: "test-project",
    repositoryName: "test-repo",
    title: `PR ${id}`,
  },
  issueId: `ISSUE-${id}`,
  filesChanged: files.map((path) => ({ path })),
});

describe("Temporal Coupling Analysis", () => {
  describe("findTemporalCouplingFromPRs", () => {
    it("should identify files that change together", () => {
      const prs = [
        createMockPR(1, ["fileA.ts", "fileB.ts"]),
        createMockPR(2, ["fileA.ts", "fileB.ts"]),
        createMockPR(3, ["fileA.ts", "fileB.ts"]),
      ];

      const result = findTemporalCouplingFromPRs(prs, 3);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fileA: "fileA.ts",
        fileB: "fileB.ts",
        coChangeCount: 3,
        percentage: 100,
      });
    });

    it("should respect the threshold", () => {
      const prs = [createMockPR(1, ["fileA.ts", "fileB.ts"]), createMockPR(2, ["fileA.ts", "fileB.ts"])];

      const result = findTemporalCouplingFromPRs(prs, 3);
      expect(result).toHaveLength(0);

      const resultLower = findTemporalCouplingFromPRs(prs, 2);
      expect(resultLower).toHaveLength(1);
    });

    it("should handle mixed file occurrences", () => {
      const prs = [
        createMockPR(1, ["fileA.ts", "fileB.ts", "fileC.ts"]),
        createMockPR(2, ["fileA.ts", "fileB.ts"]),
        createMockPR(3, ["fileA.ts", "fileC.ts"]),
        createMockPR(4, ["fileB.ts", "fileC.ts"]),
      ];

      const result = findTemporalCouplingFromPRs(prs, 2);

      expect(result).toHaveLength(3);
      expect(result.find((p) => p.fileA === "fileA.ts" && p.fileB === "fileB.ts")?.coChangeCount).toBe(2);
      expect(result.find((p) => p.fileA === "fileA.ts" && p.fileB === "fileC.ts")?.coChangeCount).toBe(2);
      expect(result.find((p) => p.fileA === "fileB.ts" && p.fileB === "fileC.ts")?.coChangeCount).toBe(2);
    });

    it("should ensure fileA is always lexicographically smaller than fileB", () => {
      const prs = [createMockPR(1, ["zebra.ts", "alpha.ts"])];

      const result = findTemporalCouplingFromPRs(prs, 1);

      expect(result[0].fileA).toBe("alpha.ts");
      expect(result[0].fileB).toBe("zebra.ts");
    });

    it("should ignore folders (files without extension)", () => {
      const prs = [
        createMockPR(1, ["src/folder", "fileA.ts"]),
        createMockPR(2, ["src/folder", "fileA.ts"]),
        createMockPR(3, ["src/folder", "fileA.ts"]),
      ];

      const result = findTemporalCouplingFromPRs(prs, 1);
      expect(result).toHaveLength(0);
    });

    it("should calculate percentage correctly", () => {
      const prs = [
        createMockPR(1, ["fileA.ts", "fileB.ts"]),
        createMockPR(2, ["fileA.ts", "fileB.ts"]),
        createMockPR(3, ["fileC.ts"]),
        createMockPR(4, ["fileD.ts"]),
      ];

      const result = findTemporalCouplingFromPRs(prs, 2);

      expect(result[0].percentage).toBe(50);
    });
  });

  describe("findTemporalCouplingForComponent", () => {
    it("should wrap analysis with component metadata", () => {
      const prs = [
        createMockPR(1, ["fileA.ts", "fileB.ts"]),
        createMockPR(2, ["fileA.ts", "fileB.ts"]),
        createMockPR(3, ["fileA.ts", "fileB.ts"]),
      ];

      const component: SoftwareComponent = {
        name: "test-service",
        repo: "test-repo",
      };

      const result = findTemporalCouplingForComponent(prs, component, "test-workload", 3);

      expect(result.workloadId).toBe("test-workload");
      expect(result.componentName).toBe("test-service");
      expect(result.repoName).toBe("test-repo");
      expect(result.couplingPairs).toHaveLength(1);
    });
  });
});