import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PipelineRuns from "@/pages/PipelineRuns";

const { mockUseSearchParams, mockRunList, mockGetWorkloadName, mockGetWorkloadPipelineFilters } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockRunList: vi.fn(),
  mockGetWorkloadName: vi.fn(),
  mockGetWorkloadPipelineFilters: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
  };
});

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/layout", () => ({
  PageBreadcrumbs: () => null,
}));

vi.mock("@/components/pipeline", () => ({
  RunList: (props: unknown) => {
    mockRunList(props);
    return null;
  },
}));

vi.mock("@/services/workload", () => ({
  getWorkloadName: (...args: unknown[]) => mockGetWorkloadName(...args),
  getWorkloadPipelineFilters: (...args: unknown[]) => mockGetWorkloadPipelineFilters(...args),
}));

describe("PipelineRuns page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkloadName.mockReturnValue("Gaia");
    mockGetWorkloadPipelineFilters.mockReturnValue({ jobGroups: ["backend", "frontend"], jobNames: ["CI"] });
  });

  it("defaults job groups from workload config when executeImmediately is true", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("workloadId=gaia&executeImmediately=true&branchName=main"),
      vi.fn(),
    ]);

    render(<PipelineRuns />);

    expect(mockGetWorkloadPipelineFilters).toHaveBeenCalledWith("gaia");
    expect(mockRunList).toHaveBeenCalledWith(
      expect.objectContaining({
        workload: "gaia",
        branchName: "main",
        executeOnMount: true,
        jobGroups: ["backend", "frontend"],
      })
    );
  });

  it("prefers explicit jobGroup query param over defaults", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("workloadId=gaia&executeImmediately=true&jobGroup=platform"),
      vi.fn(),
    ]);

    render(<PipelineRuns />);

    expect(mockRunList).toHaveBeenCalledWith(
      expect.objectContaining({
        jobGroups: ["platform"],
      })
    );
  });

  it("does not default job groups when executeImmediately is false", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("workloadId=gaia&branchName=main"), vi.fn()]);

    render(<PipelineRuns />);

    expect(mockGetWorkloadPipelineFilters).not.toHaveBeenCalled();
    expect(mockRunList).toHaveBeenCalledWith(
      expect.objectContaining({
        executeOnMount: false,
        jobGroups: [],
      })
    );
  });
});
