import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Repositories from "@/pages/Repositories";

const { mockUseSearchParams, mockGetRepositoryDetails, mockGetWorkloadDetail, mockGetWorkloadName } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockGetRepositoryDetails: vi.fn(),
  mockGetWorkloadDetail: vi.fn(),
  mockGetWorkloadName: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
  };
});

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }),
}));

vi.mock("@/components/layout", () => ({
  PageBreadcrumbs: () => null,
}));

vi.mock("@/services/workload", () => ({
  getRepositoryDetails: (...args: unknown[]) => mockGetRepositoryDetails(...args),
  getWorkloadDetail: (...args: unknown[]) => mockGetWorkloadDetail(...args),
  getWorkloadName: (...args: unknown[]) => mockGetWorkloadName(...args),
}));

describe("Repositories page action links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()]);
    mockGetWorkloadName.mockReturnValue("Workload");
    mockGetWorkloadDetail.mockReturnValue({ id: "workload-1", name: "Workload" });
  });

  it("includes all dynamic query params for pipeline health and pipeline runs links", () => {
    mockGetRepositoryDetails.mockReturnValue([
      {
        name: "team/my-repo",
        url: "https://example.com/repo",
        workloadId: "workload-1",
        workloadName: "Workload",
        repoGroups: ["platform"],
      },
    ]);

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    const healthLink = screen.getByRole("link", { name: /pages:repositories.buttonPipelineHealth/i });
    const runsLink = screen.getByRole("link", { name: /pages:repositories.buttonPipelineRuns/i });

    const healthUrl = new URL(healthLink.getAttribute("href")!, "http://localhost");
    const runsUrl = new URL(runsLink.getAttribute("href")!, "http://localhost");

    expect(healthUrl.pathname).toBe("/workload/pipeline-health");
    expect(healthUrl.searchParams.get("workloadId")).toBe("workload-1");
    expect(healthUrl.searchParams.get("executeImmediately")).toBe("true");
    expect(healthUrl.searchParams.get("branchName")).toBe("main");
    expect(healthUrl.searchParams.get("repoName")).toBe("team/my-repo");

    expect(runsUrl.pathname).toBe("/workload/pipeline-runs");
    expect(runsUrl.searchParams.get("workloadId")).toBe("workload-1");
    expect(runsUrl.searchParams.get("executeImmediately")).toBe("true");
    expect(runsUrl.searchParams.get("branchName")).toBe("main");
    expect(runsUrl.searchParams.get("repoName")).toBe("team/my-repo");
  });

  it("does not include empty repoName query param", () => {
    mockGetRepositoryDetails.mockReturnValue([
      {
        name: "",
        url: "https://example.com/repo",
        workloadId: "workload-1",
        workloadName: "Workload",
        repoGroups: ["platform"],
      },
    ]);

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    const runsLink = screen.getByRole("link", { name: /pages:repositories.buttonPipelineRuns/i });
    const runsUrl = new URL(runsLink.getAttribute("href")!, "http://localhost");

    expect(runsUrl.searchParams.get("workloadId")).toBe("workload-1");
    expect(runsUrl.searchParams.get("executeImmediately")).toBe("true");
    expect(runsUrl.searchParams.get("branchName")).toBe("main");
    expect(runsUrl.searchParams.has("repoName")).toBe(false);
  });
});
