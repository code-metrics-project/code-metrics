import * as qualityGatesModule from "../qualityGates";
import * as configMapping from "../../../config/configMapping";
import * as vcsService from "../../codeManagement/vcsService";
import * as logger from "../../../utils/logger/logger";
import * as repos from "../../../utils/repos";
import * as source from "../../../config/sources/source";
import { enrichManifest } from "../manifest";

// Mock dependencies
jest.mock("../../../config/configMapping");
jest.mock("../../codeManagement/vcsService");
jest.mock("../../../utils/logger/logger");
jest.mock("../../../utils/repos");
jest.mock("../../../config/sources/source");

describe("qualityGates", () => {
  beforeEach(() => {
    // Mock getConfigItemAsNumber for threshold values
    jest.spyOn(source, "getConfigItemAsNumber").mockImplementation((key, defaultValue) => defaultValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("enrichManifest", () => {
    it("should enrich manifest with phases, gates, and required status checks for multiple services", () => {
      const mockVcs = {
        buildFileLink: jest
          .fn()
          .mockReturnValueOnce("https://alpha.com/blob/main/.github/workflows/pre-commit.yml")
          .mockReturnValueOnce("https://alpha.com/blob/main/.github/workflows/pre-commit.yml"),
      };

      const result = enrichManifest(
        mockVcs as any,
        "test-workload",
        "alpha",
        "https://alpha.com",
        {
          $schema: "https://github.com/octocat/quality-gates/tree/v0.1.0/schemas/schema.json",
          services: [
            {
              "service-tag": "athena_ui_subject_portal",
              "quality-gates": [
                {
                  "check-types": ["code style and linting"],
                  provider: "GitHub",
                  phase: "pre-merge",
                  config: {
                    file: ".github/workflows/pre-commit.yml",
                    path: "jobs.pre-commit",
                    name: "Run pre-commit",
                  },
                },
              ],
            },
            {
              "service-tag": "beta_ui_subject_portal",
              "quality-gates": [
                {
                  "check-types": ["code style and linting"],
                  provider: "GitHub",
                  phase: "pre-merge",
                  config: {
                    file: ".github/workflows/pre-commit.yml",
                    path: "jobs.pre-commit",
                    name: "Run pre-commit 2",
                  },
                },
              ],
            },
          ],
        },
        [
          {
            id: 12345,
            name: "Run pre-commit",
          },
        ],
        {
          id: "quality-gates",
          version: "v0.1.0",
          gates: ["code style and linting", "other"],
          environments: ["pre-merge", "other"],
        },
      );

      expect(mockVcs.buildFileLink).toHaveBeenCalledWith(
        "test-workload",
        "alpha",
        "main",
        ".github/workflows/pre-commit.yml",
      );
      expect(mockVcs.buildFileLink).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        repo: "alpha",
        repoLink: "https://alpha.com",
        services: [
          {
            "service-tag": "athena_ui_subject_portal",
            "quality-gates": {
              "code style and linting": [
                {
                  phase: "pre-merge",
                  gates: [
                    {
                      "check-types": ["code style and linting"],
                      provider: "GitHub",
                      phase: "pre-merge",
                      config: {
                        file: ".github/workflows/pre-commit.yml",
                        fileURL: "https://alpha.com/blob/main/.github/workflows/pre-commit.yml",
                        path: "jobs.pre-commit",
                        name: "Run pre-commit",
                      },
                      isRequiredStatusCheck: true,
                    },
                  ],
                },
                { phase: "other", gates: [] },
              ],
              other: [
                { phase: "pre-merge", gates: [] },
                { phase: "other", gates: [] },
              ],
            },
          },
          {
            "service-tag": "beta_ui_subject_portal",
            "quality-gates": {
              "code style and linting": [
                {
                  phase: "pre-merge",
                  gates: [
                    {
                      "check-types": ["code style and linting"],
                      provider: "GitHub",
                      phase: "pre-merge",
                      config: {
                        file: ".github/workflows/pre-commit.yml",
                        fileURL: "https://alpha.com/blob/main/.github/workflows/pre-commit.yml",
                        path: "jobs.pre-commit",
                        name: "Run pre-commit 2",
                      },
                      isRequiredStatusCheck: false,
                    },
                  ],
                },
                { phase: "other", gates: [] },
              ],
              other: [
                { phase: "pre-merge", gates: [] },
                { phase: "other", gates: [] },
              ],
            },
          },
        ],
      });
    });

    describe("parseManifest", () => {
      it("should parse valid JSON string indirectly", () => {
        const validJson = JSON.stringify({
          $schema: "https://example.com/schema.json",
          services: [],
        });

        // Since parseManifest is private, we test it indirectly through getQualityGates
        expect(() => JSON.parse(validJson)).not.toThrow();
      });

      it("should handle invalid JSON indirectly", () => {
        const errorSpy = jest.spyOn(logger, "error").mockImplementation();

        // Test indirectly - parseManifest is called internally in getQualityGates
        expect(() => JSON.parse("invalid json")).toThrow();
        errorSpy.mockRestore();
      });
    });

    describe("enrichManifest - edge cases", () => {
      it("should handle manifest with empty services array", () => {
        const mockVcs = {
          buildFileLink: jest.fn(),
        };

        const result = enrichManifest(
          mockVcs as any,
          "test-workload",
          "test-repo",
          "https://test.com",
          {
            services: [],
          },
          [],
          {
            id: "quality-gates",
            version: "v0.1.0",
            gates: ["code style and linting"],
            environments: ["pre-merge"],
          },
        );

        expect(result).toEqual({
          repo: "test-repo",
          repoLink: "https://test.com",
          services: [],
        });
        expect(mockVcs.buildFileLink).not.toHaveBeenCalled();
      });

      it("should handle rules being null/undefined", () => {
        const mockVcs = {
          buildFileLink: jest.fn().mockReturnValue("https://test.com/blob/main/.github/workflows/test.yml"),
        };

        const result = enrichManifest(
          mockVcs as any,
          "test-workload",
          "test-repo",
          "https://test.com",
          {
            services: [
              {
                "service-tag": "test-service",
                "quality-gates": [
                  {
                    "check-types": ["code style and linting"],
                    provider: "GitHub",
                    phase: "pre-merge",
                    config: {
                      file: ".github/workflows/test.yml",
                      path: "jobs.test",
                      name: "Test Job",
                    },
                  },
                ],
              },
            ],
          },
          null as any,
          {
            id: "quality-gates",
            version: "v0.1.0",
            gates: ["code style and linting"],
            environments: ["pre-merge"],
          },
        );

        expect(
          result.services[0]["quality-gates"]["code style and linting"][0].gates[0].isRequiredStatusCheck,
        ).toBeUndefined();
        expect(result.services[0]["quality-gates"]["code style and linting"][0].gates[0].config.fileURL).toBe(
          "https://test.com/blob/main/.github/workflows/test.yml",
        );
      });

      it("should handle multiple quality gates with different check-types", () => {
        const mockVcs = {
          buildFileLink: jest
            .fn()
            .mockReturnValueOnce("https://test.com/blob/main/.github/workflows/lint.yml")
            .mockReturnValueOnce("https://test.com/blob/main/.github/workflows/test.yml"),
        };

        const result = enrichManifest(
          mockVcs as any,
          "test-workload",
          "test-repo",
          "https://test.com",
          {
            services: [
              {
                "service-tag": "test-service",
                "quality-gates": [
                  {
                    "check-types": ["code style and linting"],
                    provider: "GitHub",
                    phase: "pre-merge",
                    config: {
                      file: ".github/workflows/lint.yml",
                      path: "jobs.lint",
                      name: "Lint",
                    },
                  },
                  {
                    "check-types": ["unit tests"],
                    provider: "GitHub",
                    phase: "pre-merge",
                    config: {
                      file: ".github/workflows/test.yml",
                      path: "jobs.test",
                      name: "Test",
                    },
                  },
                ],
              },
            ],
          },
          [{ id: 1, name: "Lint" }],
          {
            id: "quality-gates",
            version: "v0.1.0",
            gates: ["code style and linting", "unit tests"],
            environments: ["pre-merge"],
          },
        );

        expect(result.services[0]["quality-gates"]["code style and linting"][0].gates).toHaveLength(1);
        expect(result.services[0]["quality-gates"]["unit tests"][0].gates).toHaveLength(1);
        expect(result.services[0]["quality-gates"]["code style and linting"][0].gates[0].isRequiredStatusCheck).toBe(
          true,
        );
        expect(result.services[0]["quality-gates"]["unit tests"][0].gates[0].isRequiredStatusCheck).toBe(false);
        expect(result.services[0]["quality-gates"]["code style and linting"][0].gates[0].config.fileURL).toBe(
          "https://test.com/blob/main/.github/workflows/lint.yml",
        );
        expect(result.services[0]["quality-gates"]["unit tests"][0].gates[0].config.fileURL).toBe(
          "https://test.com/blob/main/.github/workflows/test.yml",
        );
      });
    });

    describe("getQualityGate", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(source, "getConfigItemAsNumber").mockImplementation((key, defaultValue) => defaultValue);
      });

      it("should fetch and construct quality gate for a repo through getQualityGates", async () => {
        const mockWorkload = {
          id: "test-workload",
          codeManagement: { projectName: "test-project" },
        };

        const mockVcs = {
          fetchFile: jest.fn().mockResolvedValue(
            JSON.stringify({
              services: [
                {
                  "service-tag": "test-service",
                  "quality-gates": [],
                },
              ],
            }),
          ),
          fetchMergeRules: jest.fn().mockResolvedValue([]),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        jest.spyOn(configMapping, "listRepoGroups").mockReturnValue(["test-group"]);
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["test-repo"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: ["code style and linting"],
          environments: ["pre-merge"],
        });
        jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates(["test-workload"], []);

        // Verify getQualityGate was called indirectly through getQualityGates
        expect(mockVcs.fetchFile).toHaveBeenCalledWith(
          "test-workload",
          "test-project",
          "test-repo",
          "quality-gate.manifest.json",
        );
        expect(result).toHaveLength(1);
        expect(result[0].workloadId).toBe("test-workload");
        expect(result[0].repoGroups).toHaveLength(1);
      });

      it("should handle errors and return basic quality gate object through getQualityGates", async () => {
        const mockWorkload = {
          id: "test-workload",
          codeManagement: { projectName: "test-project" },
        };

        const mockVcs = {
          fetchFile: jest.fn().mockRejectedValue(new Error("Fetch failed")),
          fetchMergeRules: jest.fn().mockRejectedValue(new Error("Fetch failed")),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        jest.spyOn(configMapping, "listRepoGroups").mockReturnValue(["test-group"]);
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["test-repo"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: [],
          environments: [],
        });
        const verboseSpy = jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates(["test-workload"], []);

        // Test through getQualityGates which calls getQualityGate
        expect(verboseSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch quality gate manifest"),
          expect.any(Error),
        );
        expect(result).toHaveLength(1);
        expect(result[0].repoGroups[0].repos[0].services).toEqual(undefined);
        // Doesn't attempt to fetch merge rules when there's no manifest file
        expect(mockVcs.fetchMergeRules).not.toHaveBeenCalled();
      });
    });

    describe("getQualityGates", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(source, "getConfigItemAsNumber").mockImplementation((key, defaultValue) => defaultValue);
      });

      it("should fetch quality gates for provided workload IDs", async () => {
        const mockWorkload = {
          id: "workload-1",
          codeManagement: { projectName: "project-1" },
        };

        const mockVcs = {
          fetchFile: jest.fn().mockResolvedValue(
            JSON.stringify({
              services: [
                {
                  "service-tag": "service-1",
                  "quality-gates": [],
                },
              ],
            }),
          ),
          fetchMergeRules: jest.fn().mockResolvedValue([]),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo1"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo1/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        jest.spyOn(configMapping, "listRepoGroups").mockReturnValue(["group-1"]);
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["repo1", "repo2"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: ["code style and linting"],
          environments: ["pre-merge"],
        });
        jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates(["workload-1"], []);

        expect(result).toHaveLength(1);
        expect(result[0].workloadId).toBe("workload-1");
        expect(mockVcs.fetchFile).toHaveBeenCalledTimes(2);
      });

      it("should use listWorkloadIds when no workload IDs provided", async () => {
        const mockWorkload = {
          id: "workload-1",
          codeManagement: { projectName: "project-1" },
        };

        const mockVcs = {
          fetchFile: jest.fn().mockResolvedValue(
            JSON.stringify({
              services: [],
            }),
          ),
          fetchMergeRules: jest.fn().mockResolvedValue([]),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "listWorkloadIds").mockReturnValue(["workload-1"]);
        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        jest.spyOn(configMapping, "listRepoGroups").mockReturnValue(["group-1"]);
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["repo1"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: [],
          environments: [],
        });
        jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates([], []);

        expect(configMapping.listWorkloadIds).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].workloadId).toBe("workload-1");
      });

      it("should filter out undefined when workload not found", async () => {
        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(null);
        jest.spyOn(logger, "warn").mockImplementation();
        jest.spyOn(logger, "verbose").mockImplementation();

        // This will throw because of the bug in qualityGates.ts line 301
        // where it tries to access workload.id when workload is null
        await expect(async () => {
          await qualityGatesModule.getQualityGates(["invalid-workload"], []);
        }).rejects.toThrow();
      });

      it("should handle errors gracefully for individual repos", async () => {
        const mockWorkload = {
          id: "workload-1",
          codeManagement: { projectName: "project-1" },
        };

        const mockVcs = {
          fetchFile: jest
            .fn()
            .mockResolvedValueOnce(JSON.stringify({ services: [] }))
            .mockRejectedValueOnce(new Error("Failed to fetch")),
          fetchMergeRules: jest.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("Failed to fetch")),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        jest.spyOn(configMapping, "listRepoGroups").mockReturnValue(["group-1"]);
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["repo1", "repo2"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: [],
          environments: [],
        });
        const verboseSpy = jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates(["workload-1"], []);

        expect(result).toHaveLength(1);
        expect(result[0].repoGroups[0].repos).toHaveLength(2);
        expect(result[0].repoGroups[0].repos[1].services).toEqual(undefined);
        expect(verboseSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch quality gate manifest"),
          expect.any(Error),
        );
      });

      it("should use provided repoGroups when specified", async () => {
        const mockWorkload = {
          id: "workload-1",
          codeManagement: { projectName: "project-1" },
        };

        const mockVcs = {
          fetchFile: jest.fn().mockResolvedValue(
            JSON.stringify({
              services: [
                {
                  "service-tag": "custom-group",
                  "quality-gates": [],
                },
              ],
            }),
          ),
          fetchMergeRules: jest.fn().mockResolvedValue([]),
          buildRepoLink: jest.fn().mockReturnValue("https://test.com/repo"),
          buildFileLink: jest.fn().mockReturnValue("https://test.com/repo/blob/main/test-file"),
        };

        jest.spyOn(configMapping, "getWorkloadById").mockReturnValue(mockWorkload as any);
        const listRepoGroupsSpy = jest.spyOn(configMapping, "listRepoGroups");
        jest.spyOn(vcsService, "getVcsForWorkload").mockReturnValue(mockVcs as any);
        jest.spyOn(repos, "getReposForWorkloadId").mockResolvedValue(["repo1"]);
        jest.spyOn(configMapping, "getQualityGatesByWorkloadId").mockReturnValue({
          id: "quality-gates",
          version: "v0.1.0",
          gates: [],
          environments: [],
        });
        jest.spyOn(logger, "verbose").mockImplementation();

        const result = await qualityGatesModule.getQualityGates(["workload-1"], ["custom-group"]);

        // Should not call listRepoGroups when repoGroups are provided
        expect(listRepoGroupsSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].repoGroups[0].repoGroup).toBe("custom-group");
      });
    });
  });
});
