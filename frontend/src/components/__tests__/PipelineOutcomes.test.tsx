import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/i18n";
import { PipelineOutcomes } from "@/components/pipeline/PipelineOutcomes";

type MockUseConfigResult = {
  config: {
    systemConfig?: {
      workloads: Array<{ id: string; jobs: Record<string, string[]> }>;
    };
  } | null;
  isLoading: boolean;
};

const { mockUseConfig, mockUsePipelineOutcomesPerJobGroup } = vi.hoisted(() => ({
  mockUseConfig: vi.fn<() => MockUseConfigResult>(),
  mockUsePipelineOutcomesPerJobGroup: vi.fn(),
}));

vi.mock("@/hooks/useConfig", () => ({
  useConfig: () => mockUseConfig(),
}));

vi.mock("@/queries/usePipelineOutcomesPerJobGroup", () => ({
  usePipelineOutcomesPerJobGroup: (...args: unknown[]) => mockUsePipelineOutcomesPerJobGroup(...args),
}));

vi.mock("@/components/inputs/DynamicInputs", () => ({
  InputType: {
    WORKLOAD_NAMES: "workloads",
    TAGS: "tags",
  },
  DynamicInputs: () => <div data-testid="dynamic-inputs" />,
}));

vi.mock("@/components/charts", () => ({
  DoughnutChart: () => <div data-testid="doughnut-chart" />,
}));

function renderComponent(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe("PipelineOutcomes job group defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipelineOutcomesPerJobGroup.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("applies all workload job groups by default when auto-executing", async () => {
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [
            { id: "workload-a", jobs: { build: ["build-main"], deploy: ["deploy-main"] } },
            { id: "workload-b", jobs: { test: ["test-main"] } },
          ],
        },
      },
      isLoading: false,
    });

    renderComponent(<PipelineOutcomes workload="workload-a" executeOnMount={true} branchName="main" />);

    await waitFor(() => {
      expect(mockUsePipelineOutcomesPerJobGroup).toHaveBeenCalled();
      const matchingCall = mockUsePipelineOutcomesPerJobGroup.mock.calls.find(
        (call) =>
          Array.isArray((call[0] as { jobGroups?: string[] }).jobGroups) &&
          JSON.stringify((call[0] as { jobGroups?: string[] }).jobGroups) === JSON.stringify(["build", "deploy"]) &&
          call[1] === true
      );
      expect(matchingCall).toBeTruthy();
    });
  });

  it("waits for config to load before auto-executing and setting workload job groups", async () => {
    let configState: MockUseConfigResult = {
      config: {
        systemConfig: {
          workloads: [],
        },
      },
      isLoading: true,
    };

    mockUseConfig.mockImplementation(() => configState);

    const view = renderComponent(<PipelineOutcomes workload="workload-a" executeOnMount={true} branchName="main" />);

    await waitFor(() => {
      expect(mockUsePipelineOutcomesPerJobGroup).toHaveBeenCalled();
      const latestCall = mockUsePipelineOutcomesPerJobGroup.mock.calls.at(-1);
      expect(latestCall?.[1]).toBe(false);
    });

    configState = {
      config: {
        systemConfig: {
          workloads: [{ id: "workload-a", jobs: { build: ["build-main"], deploy: ["deploy-main"] } }],
        },
      },
      isLoading: false,
    };

    view.rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <I18nextProvider i18n={i18n}>
          <MemoryRouter>
            <PipelineOutcomes workload="workload-a" executeOnMount={true} branchName="main" />
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const matchingCall = mockUsePipelineOutcomesPerJobGroup.mock.calls.find(
        (call) =>
          Array.isArray((call[0] as { jobGroups?: string[] }).jobGroups) &&
          JSON.stringify((call[0] as { jobGroups?: string[] }).jobGroups) === JSON.stringify(["build", "deploy"]) &&
          call[1] === true
      );
      expect(matchingCall).toBeTruthy();
    });
  });

  it("renders multiple outcome tiles when several job group graphs are returned", async () => {
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [{ id: "workload-a", jobs: { build: ["build-main"], deploy: ["deploy-main"] } }],
        },
      },
      isLoading: false,
    });

    mockUsePipelineOutcomesPerJobGroup.mockReturnValue({
      data: [
        {
          key: "build",
          success: 90,
          failure: 10,
          total: 100,
          chartData: {
            labels: ["success", "failed"],
            datasets: [{ data: [90, 10], backgroundColor: ["#22c55e", "#ef4444"] }],
          },
          runsUrl: "/workload/pipeline-runs?jobGroup=build",
        },
        {
          key: "deploy",
          success: 80,
          failure: 20,
          total: 100,
          chartData: {
            labels: ["success", "failed"],
            datasets: [{ data: [80, 20], backgroundColor: ["#22c55e", "#ef4444"] }],
          },
          runsUrl: "/workload/pipeline-runs?jobGroup=deploy",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderComponent(<PipelineOutcomes workload="workload-a" executeOnMount={true} />);

    await waitFor(() => {
      expect(screen.getByText("build")).toBeTruthy();
      expect(screen.getByText("deploy")).toBeTruthy();
    });

    expect(screen.getAllByText("100 runs")).toHaveLength(2);
    expect(screen.getAllByTestId("doughnut-chart")).toHaveLength(2);
  });

  it("does not include stageId by default when not provided", async () => {
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [{ id: "workload-a", jobs: { build: ["build-main"] } }],
        },
      },
      isLoading: false,
    });

    renderComponent(<PipelineOutcomes workload="workload-a" executeOnMount={true} branchName="main" />);

    await waitFor(() => {
      expect(mockUsePipelineOutcomesPerJobGroup).toHaveBeenCalled();
      const enabledCall = mockUsePipelineOutcomesPerJobGroup.mock.calls.find((call) => call[1] === true);
      expect(enabledCall).toBeTruthy();
      expect((enabledCall?.[0] as { stageId?: string }).stageId).toBeUndefined();
    });
  });

  it("includes stageId when explicitly provided", async () => {
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [{ id: "workload-a", jobs: { build: ["build-main"] } }],
        },
      },
      isLoading: false,
    });

    renderComponent(
      <PipelineOutcomes workload="workload-a" executeOnMount={true} branchName="main" stageId="deploy-stage" />
    );

    await waitFor(() => {
      const matchingCall = mockUsePipelineOutcomesPerJobGroup.mock.calls.find(
        (call) => (call[0] as { stageId?: string }).stageId === "deploy-stage" && call[1] === true
      );
      expect(matchingCall).toBeTruthy();
    });
  });
});
