import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { TemporalCoupling } from "@/components/TemporalCoupling";

const { mockUseTemporalCoupling } = vi.hoisted(() => ({
  mockUseTemporalCoupling: vi.fn(),
}));

vi.mock("@/queries/useTemporalCoupling", () => ({
  useTemporalCoupling: (...args: unknown[]) => mockUseTemporalCoupling(...args),
}));

function renderTemporalCoupling() {
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
        <TemporalCoupling workload="demo-workload" executeOnMount={false} />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe("TemporalCoupling", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    mockUseTemporalCoupling.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it("renders temporal coupling title and action button", () => {
    renderTemporalCoupling();

    expect(screen.getByText("Temporal coupling analysis")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run analysis" })).toBeTruthy();
  });

  it("renders ribbon view by default when temporal coupling data exists", () => {
    mockUseTemporalCoupling.mockReturnValue({
      data: [
        {
          workloadId: "demo-workload",
          componentName: "backend",
          repoName: "code-metrics",
          totalCommits: 12,
          couplingPairs: [
            {
              fileA: "/src/a.ts",
              fileB: "/src/b.ts",
              coChangeCount: 4,
              percentage: 33.3,
            },
          ],
        },
      ],
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderTemporalCoupling();

    expect(screen.getByText("Analysis of backend")).toBeTruthy();
    expect(screen.getByTestId("temporal-coupling-ribbon-chart")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export as PNG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();
  });

  it("switches to table view when selected", () => {
    mockUseTemporalCoupling.mockReturnValue({
      data: [
        {
          workloadId: "demo-workload",
          componentName: "backend",
          repoName: "code-metrics",
          totalCommits: 12,
          couplingPairs: [
            {
              fileA: "/src/a.ts",
              fileB: "/src/b.ts",
              coChangeCount: 4,
              percentage: 33.3,
            },
          ],
        },
      ],
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderTemporalCoupling();

    fireEvent.click(screen.getByRole("radio", { name: "Table view" }));

    expect(screen.getByText("/src/a.ts")).toBeTruthy();
    expect(screen.getByText("/src/b.ts")).toBeTruthy();
    expect(screen.getByText("33.3%")).toBeTruthy();
  });
});
