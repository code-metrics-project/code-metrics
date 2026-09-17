import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import { PipelineOutcomes } from "@/components/pipeline/PipelineOutcomes";
import type { PipelineHealthOutcome } from "@/queries/pipelineOutcomes";

type MockHookResult = {
  outcomes: PipelineHealthOutcome[];
  isBusy: boolean;
  error: Error | null;
  hasExecuted: boolean;
  execute: (...args: unknown[]) => Promise<void>;
};

const { mockUsePipelineHealthOutcomes, mockListWorkloadIds, capturedDynamicInputs } = vi.hoisted(() => ({
  mockUsePipelineHealthOutcomes: vi.fn(),
  mockListWorkloadIds: vi.fn<() => string[]>(),
  capturedDynamicInputs: { props: null as Record<string, unknown> | null },
}));

vi.mock("@/config", () => ({
  listWorkloadIds: () => mockListWorkloadIds(),
}));

vi.mock("@/queries/usePipelineHealthOutcomes", () => ({
  usePipelineHealthOutcomes: () => mockUsePipelineHealthOutcomes(),
}));

vi.mock("@/components/inputs", () => ({
  InputType: {
    TAGS: "tags",
  },
  DynamicInputs: (props: Record<string, unknown>) => {
    capturedDynamicInputs.props = props;
    return <div data-testid="dynamic-inputs" />;
  },
}));

vi.mock("@/components/charts", () => ({
  DoughnutChart: () => <div data-testid="doughnut-chart" />,
}));

function renderComponent(ui: React.ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  );
}

const outcome: PipelineHealthOutcome = {
  key: "workload-a-build",
  success: 70,
  chartData: {
    labels: ["runs-successful/workload-a", "runs-failed/workload-a"],
    data: [70, 30],
    colors: ["#10b981", "#ef4444"],
  },
  runsUrl: "/workload/pipeline-runs?executeImmediately=true&workloadId=workload-a&jobGroup=build",
};

function hookResult(overrides: Partial<MockHookResult> = {}): MockHookResult {
  return {
    outcomes: [],
    isBusy: false,
    error: null,
    hasExecuted: false,
    execute: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("PipelineOutcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDynamicInputs.props = null;
    mockListWorkloadIds.mockReturnValue(["workload-a", "workload-b"]);
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult());
  });

  it("renders the title and description", () => {
    renderComponent(<PipelineOutcomes />);

    expect(screen.getByText("Pipeline health")).toBeTruthy();
    expect(screen.getByText("Outcome of pipeline runs.")).toBeTruthy();
  });

  it("defaults to all workloads when no workload is provided", () => {
    renderComponent(<PipelineOutcomes />);

    const defaultInputs = capturedDynamicInputs.props?.defaultInputs as Record<string, unknown>;
    expect(defaultInputs.workloads).toEqual(["workload-a", "workload-b"]);
    expect(capturedDynamicInputs.props?.hideInputs).toContain("tags");
  });

  it("restricts default workloads to the provided workload", () => {
    renderComponent(<PipelineOutcomes workload="workload-a" />);

    const defaultInputs = capturedDynamicInputs.props?.defaultInputs as Record<string, unknown>;
    expect(defaultInputs.workloads).toEqual(["workload-a"]);
  });

  it("includes stageId and branchNames in the default inputs when provided", () => {
    renderComponent(<PipelineOutcomes workload="workload-a" stageId="stage-1" branchName="main" />);

    const defaultInputs = capturedDynamicInputs.props?.defaultInputs as Record<string, unknown>;
    expect(defaultInputs.stageId).toBe("stage-1");
    expect(defaultInputs.branchNames).toEqual(["main"]);
  });

  it("omits stageId and branchNames from the default inputs when not provided", () => {
    renderComponent(<PipelineOutcomes workload="workload-a" />);

    const defaultInputs = capturedDynamicInputs.props?.defaultInputs as Record<string, unknown>;
    expect(defaultInputs.stageId).toBeUndefined();
    expect(defaultInputs.branchNames).toBeUndefined();
  });

  it("renders an outcome card per outcome with success percentage, chart and runs link", () => {
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult({ outcomes: [outcome], hasExecuted: true }));

    renderComponent(<PipelineOutcomes />);

    expect(screen.getByText("workload-a-build")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByTestId("doughnut-chart")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Show runs" });
    expect(link.getAttribute("href")).toBe(outcome.runsUrl);
  });

  it("renders multiple outcome cards", () => {
    const second: PipelineHealthOutcome = { ...outcome, key: "workload-b-deploy" };
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult({ outcomes: [outcome, second], hasExecuted: true }));

    renderComponent(<PipelineOutcomes />);

    expect(screen.getByText("workload-a-build")).toBeTruthy();
    expect(screen.getByText("workload-b-deploy")).toBeTruthy();
    expect(screen.getAllByTestId("doughnut-chart")).toHaveLength(2);
  });

  it("does not render a runs link when the outcome has no runs url", () => {
    const noUrl: PipelineHealthOutcome = { ...outcome, runsUrl: null };
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult({ outcomes: [noUrl], hasExecuted: true }));

    renderComponent(<PipelineOutcomes />);

    expect(screen.queryByRole("link", { name: "Show runs" })).toBeNull();
  });

  it("renders an error alert when the query fails", () => {
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult({ error: new Error("boom"), hasExecuted: true }));

    renderComponent(<PipelineOutcomes />);

    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("renders a no-data message when executed but no outcomes were returned", () => {
    mockUsePipelineHealthOutcomes.mockReturnValue(hookResult({ hasExecuted: true }));

    renderComponent(<PipelineOutcomes />);

    expect(screen.getByText("No data available")).toBeTruthy();
  });

  it("renders no results content before the first execution", () => {
    renderComponent(<PipelineOutcomes />);

    expect(screen.queryByText("No data available")).toBeNull();
    expect(screen.queryByTestId("doughnut-chart")).toBeNull();
  });
});
