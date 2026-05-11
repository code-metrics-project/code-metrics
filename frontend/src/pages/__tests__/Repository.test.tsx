import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Repository from "@/pages/Repository";

const { mockUseParams, mockGetRepositoryDetail, mockGetWorkloadDetail, mockDashboard } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockGetRepositoryDetail: vi.fn(),
  mockGetWorkloadDetail: vi.fn(),
  mockDashboard: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  }),
}));

vi.mock("@/services/workload", () => ({
  getRepositoryDetail: (...args: unknown[]) => mockGetRepositoryDetail(...args),
  getWorkloadDetail: (...args: unknown[]) => mockGetWorkloadDetail(...args),
}));

vi.mock("@/components/dashboard", () => ({
  Dashboard: (props: { dashboard: { name: string } }) => {
    mockDashboard(props);
    return <div data-testid="dashboard">{props.dashboard.name}</div>;
  },
}));

const baseRepo = {
  name: "org/my-repo",
  url: "https://github.com/org/my-repo",
  workloadId: "athena",
  workloadName: "Athena",
  repoGroups: ["backend"],
};

describe("Repository page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ workloadId: "athena", repoGroup: "backend", repoName: "org%2Fmy-repo" });
    mockGetWorkloadDetail.mockReturnValue({ id: "athena", name: "Athena" });
    mockGetRepositoryDetail.mockReturnValue(baseRepo);
  });

  it("renders the repo name as the page heading", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "org/my-repo" })).toBeDefined();
  });

  it("shows the workload name as a link in the metadata row", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    const workloadLinks = screen.getAllByRole("link", { name: "Athena" });
    expect(workloadLinks.length).toBeGreaterThanOrEqual(1);
    expect(workloadLinks.every((l) => l.getAttribute("href")?.includes("athena"))).toBe(true);
  });

  it("shows repo groups as badges in the metadata row", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(screen.getByText("backend")).toBeDefined();
  });

  it("shows an external link to the repo URL", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    const repoLink = screen.getByRole("link", { name: /pages:repository\.openRepo/i });
    expect(repoLink.getAttribute("href")).toBe("https://github.com/org/my-repo");
  });

  it("renders the Dashboard component", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(screen.getByTestId("dashboard")).toBeDefined();
  });

  it("passes a dashboard with the repo name to Dashboard", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(mockDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ dashboard: expect.objectContaining({ name: "org/my-repo" }) })
    );
  });

  it("passes 6 dashboard items", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    const dashboard = mockDashboard.mock.calls[0][0].dashboard;
    expect(dashboard.data).toHaveLength(6);
  });

  it("dashboard items include coverage, loc, complexity, churn, pipeline, vulnerabilities", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    const dashboard = mockDashboard.mock.calls[0][0].dashboard;
    const ids = dashboard.data.map((d: { id: string }) => d.id);
    expect(ids).toContain("coverage-trend");
    expect(ids).toContain("loc-chart");
    expect(ids).toContain("complexity-chart");
    expect(ids).toContain("churn-chart");
    expect(ids).toContain("pipeline-success");
    expect(ids).toContain("vulnerabilities-chart");
  });

  it("calls getRepositoryDetail with decoded repo name", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(mockGetRepositoryDetail).toHaveBeenCalledWith("athena", "org/my-repo");
  });

  it("shows breadcrumb links to workloads, workload and repositories", () => {
    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    // Multiple "Athena" links exist (breadcrumb + metadata row) — just verify at least one is present
    expect(screen.getAllByRole("link", { name: /Athena/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /pages:workload\.repositories/i })).toBeDefined();
  });
});

describe("Repository page not-found guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows not-found when workloadId is missing", () => {
    mockUseParams.mockReturnValue({ workloadId: undefined, repoGroup: "backend", repoName: "my-repo" });
    mockGetRepositoryDetail.mockReturnValue(undefined);
    mockGetWorkloadDetail.mockReturnValue(null);

    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(screen.getByText("pages:repository.notFound")).toBeDefined();
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });

  it("shows not-found when repo is not found in config", () => {
    mockUseParams.mockReturnValue({ workloadId: "athena", repoGroup: "backend", repoName: "missing-repo" });
    mockGetRepositoryDetail.mockReturnValue(undefined);
    mockGetWorkloadDetail.mockReturnValue({ id: "athena", name: "Athena" });

    render(
      <MemoryRouter>
        <Repository />
      </MemoryRouter>
    );

    expect(screen.getByText("pages:repository.notFound")).toBeDefined();
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });
});
