import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PipelineQueryBuilder from "@/pages/PipelineQueryBuilder";

const { mockUseSearchParams, mockQueryBuilder } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockQueryBuilder: vi.fn(),
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
  PipelineOutcomesPerWorkload: (props: unknown) => {
    mockQueryBuilder(props);
    return <div data-testid="pipeline-query-builder" />;
  },
}));

vi.mock("@/services/workload", () => ({
  getWorkloadName: () => "Gaia",
}));

describe("PipelineQueryBuilder page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes workload, stage, branch and execute flags from the query string", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("workloadId=gaia&executeImmediately=true&stageId=deploy&branchName=main"),
      vi.fn(),
    ]);

    render(<PipelineQueryBuilder />);

    expect(screen.getByText("pages:pipelineQueryBuilder.title")).toBeTruthy();
    expect(screen.getByText("pages:pipelineQueryBuilder.description")).toBeTruthy();
    expect(mockQueryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        workload: "gaia",
        stageId: "deploy",
        branchName: "main",
        executeOnMount: true,
        hideInputs: ["tags"],
      })
    );
  });

  it("renders without a workload and without auto-execution by default", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(""), vi.fn()]);

    render(<PipelineQueryBuilder />);

    expect(mockQueryBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        workload: undefined,
        stageId: undefined,
        branchName: undefined,
        executeOnMount: false,
        hideInputs: ["tags"],
      })
    );
  });
});
