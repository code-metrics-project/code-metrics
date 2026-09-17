import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PipelineHealth from "@/pages/PipelineHealth";

const { mockUseSearchParams, mockPipelineOutcomes, mockListPipelineStages } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockPipelineOutcomes: vi.fn(),
  mockListPipelineStages: vi.fn<() => string[]>(),
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

vi.mock("@/components/inputs", () => ({
  InputType: { TAGS: "tags" },
}));

vi.mock("@/components/pipeline", () => ({
  PipelineOutcomes: (props: unknown) => {
    mockPipelineOutcomes(props);
    return <div data-testid="pipeline-health" />;
  },
}));

vi.mock("@/config", () => ({
  listPipelineStages: () => mockListPipelineStages(),
}));

vi.mock("@/services/workload", () => ({
  getWorkloadName: () => "Gaia",
}));

describe("PipelineHealth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPipelineStages.mockReturnValue(["build", "deploy"]);
  });

  it("falls back to the first configured pipeline stage when no stageId is given", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("workloadId=gaia"), vi.fn()]);

    render(<PipelineHealth />);

    expect(screen.getByText("pages:pipelineHealth.title")).toBeTruthy();
    expect(mockPipelineOutcomes).toHaveBeenCalledWith(
      expect.objectContaining({
        workload: "gaia",
        stageId: "build",
        branchName: undefined,
        executeOnMount: false,
        hideInputs: ["tags"],
      })
    );
  });

  it("prefers an explicit stageId query param over the default", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("stageId=deploy&executeImmediately=true"), vi.fn()]);

    render(<PipelineHealth />);

    expect(mockPipelineOutcomes).toHaveBeenCalledWith(
      expect.objectContaining({
        workload: undefined,
        stageId: "deploy",
        executeOnMount: true,
      })
    );
  });

  it("does not fall back to a stage when none are configured", () => {
    mockListPipelineStages.mockReturnValue([]);
    mockUseSearchParams.mockReturnValue([new URLSearchParams(""), vi.fn()]);

    render(<PipelineHealth />);

    expect(mockPipelineOutcomes).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: undefined,
      })
    );
  });
});
