/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { getRepositoryDetails } from "../workload";
import * as config from "@/utils/config";
import type { WorkloadMeta } from "@/model/config";

// Mock the config module
vi.mock("@/utils/config", () => ({
  getConfig: vi.fn(),
  listWorkloads: vi.fn(),
}));

describe("getRepositoryDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all repositories across all workloads when no workloadId is provided", () => {
    // Setup mock data
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "auth",
        name: "Auth",
        repos: {
          backend: [{ name: "authentication-api", url: "https://github.com/example/authentication-api" }],
          frontend: [{ name: "authentication-frontend", url: "https://github.com/example/authentication-frontend" }],
        },
        jobs: {},
        pipelineStages: [],
      },
      {
        id: "bravo",
        name: "Bravo",
        repos: {
          backend: [
            { name: "ipv-identity-reuse-storage", url: "https://github.com/example/ipv-identity-reuse-storage" },
          ],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([
      { id: "auth", name: "Auth" },
      { id: "bravo", name: "Bravo" },
    ]);

    const result = getRepositoryDetails();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: "authentication-api",
      url: "https://github.com/example/authentication-api",
      workloadId: "auth",
      workloadName: "Auth",
      repoGroups: ["backend"],
    });
    expect(result[1]).toEqual({
      name: "authentication-frontend",
      url: "https://github.com/example/authentication-frontend",
      workloadId: "auth",
      workloadName: "Auth",
      repoGroups: ["frontend"],
    });
    expect(result[2]).toEqual({
      name: "ipv-identity-reuse-storage",
      url: "https://github.com/example/ipv-identity-reuse-storage",
      workloadId: "bravo",
      workloadName: "Bravo",
      repoGroups: ["backend"],
    });
  });

  it("returns only repositories for a specific workload when workloadId is provided", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "auth",
        name: "Auth",
        repos: {
          backend: [{ name: "authentication-api", url: "https://github.com/example/authentication-api" }],
          frontend: [{ name: "authentication-frontend", url: "https://github.com/example/authentication-frontend" }],
        },
        jobs: {},
        pipelineStages: [],
      },
      {
        id: "bravo",
        name: "Bravo",
        repos: {
          backend: [
            { name: "ipv-identity-reuse-storage", url: "https://github.com/example/ipv-identity-reuse-storage" },
          ],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([
      { id: "auth", name: "Auth" },
      { id: "bravo", name: "Bravo" },
    ]);

    const result = getRepositoryDetails("auth");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "authentication-api",
      url: "https://github.com/example/authentication-api",
      workloadId: "auth",
      workloadName: "Auth",
      repoGroups: ["backend"],
    });
    expect(result[1]).toEqual({
      name: "authentication-frontend",
      url: "https://github.com/example/authentication-frontend",
      workloadId: "auth",
      workloadName: "Auth",
      repoGroups: ["frontend"],
    });
  });

  it("handles repositories that belong to multiple repo groups", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "multi",
        name: "Multi",
        repos: {
          backend: [{ name: "shared-repo", url: "https://github.com/example/shared-repo" }],
          frontend: [{ name: "shared-repo", url: "https://github.com/example/shared-repo" }],
          platform: [{ name: "shared-repo", url: "https://github.com/example/shared-repo" }],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([{ id: "multi", name: "Multi" }]);

    const result = getRepositoryDetails("multi");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "shared-repo",
      url: "https://github.com/example/shared-repo",
      workloadId: "multi",
      workloadName: "Multi",
      repoGroups: ["backend", "frontend", "platform"],
    });
  });

  it("sorts repositories by workload name then repo name", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "zeta",
        name: "Zeta",
        repos: {
          backend: [{ name: "z-repo", url: "https://github.com/example/z-repo" }],
        },
        jobs: {},
        pipelineStages: [],
      },
      {
        id: "alpha",
        name: "Alpha",
        repos: {
          backend: [
            { name: "b-repo", url: "https://github.com/example/b-repo" },
            { name: "a-repo", url: "https://github.com/example/a-repo" },
          ],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([
      { id: "zeta", name: "Zeta" },
      { id: "alpha", name: "Alpha" },
    ]);

    const result = getRepositoryDetails();

    expect(result).toHaveLength(3);
    expect(result[0].workloadName).toBe("Alpha");
    expect(result[0].name).toBe("a-repo");
    expect(result[1].workloadName).toBe("Alpha");
    expect(result[1].name).toBe("b-repo");
    expect(result[2].workloadName).toBe("Zeta");
    expect(result[2].name).toBe("z-repo");
  });

  it("sorts repo groups alphabetically", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "test",
        name: "Test",
        repos: {
          platform: [{ name: "test-repo", url: "https://github.com/example/test-repo" }],
          backend: [{ name: "test-repo", url: "https://github.com/example/test-repo" }],
          frontend: [{ name: "test-repo", url: "https://github.com/example/test-repo" }],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([{ id: "test", name: "Test" }]);

    const result = getRepositoryDetails("test");

    expect(result).toHaveLength(1);
    expect(result[0].repoGroups).toEqual(["backend", "frontend", "platform"]);
  });

  it("returns empty array when no repositories exist", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "empty",
        name: "Empty",
        repos: {},
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([{ id: "empty", name: "Empty" }]);

    const result = getRepositoryDetails("empty");

    expect(result).toHaveLength(0);
  });

  it("returns empty array when workloadId does not exist", () => {
    const mockWorkloads: WorkloadMeta[] = [
      {
        id: "auth",
        name: "Auth",
        repos: {
          backend: [{ name: "authentication-api", url: "https://github.com/example/authentication-api" }],
        },
        jobs: {},
        pipelineStages: [],
      },
    ];

    vi.mocked(config.getConfig).mockReturnValue({
      systemConfig: {
        workloads: mockWorkloads,
        branches: [],
        issuePriorities: [],
        tags: {},
      },
    } as any);

    vi.mocked(config.listWorkloads).mockReturnValue([{ id: "auth", name: "Auth" }]);

    const result = getRepositoryDetails("nonexistent");

    expect(result).toHaveLength(0);
  });
});
