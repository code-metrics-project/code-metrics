import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Repositories from "@/pages/Repositories";

const { mockUseParams, mockGetRepositoryDetails, mockGetWorkloadDetail, mockGetWorkloadName, mockRepoGroups } =
  vi.hoisted(() => ({
    mockUseParams: vi.fn(),
    mockGetRepositoryDetails: vi.fn(),
    mockGetWorkloadDetail: vi.fn(),
    mockGetWorkloadName: vi.fn(),
    mockRepoGroups: vi.fn(),
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

vi.mock("@/components/layout", () => ({
  PageBreadcrumbs: () => null,
}));

vi.mock("@/services/workload", () => ({
  getRepositoryDetails: (...args: unknown[]) => mockGetRepositoryDetails(...args),
  getWorkloadDetail: (...args: unknown[]) => mockGetWorkloadDetail(...args),
  getWorkloadName: (...args: unknown[]) => mockGetWorkloadName(...args),
}));

vi.mock("@/components/inputs/RepoGroups", () => ({
  RepoGroups: (props: { onChange?: (groups: string[]) => void }) => {
    mockRepoGroups(props);
    return <div data-testid="repo-groups-filter" />;
  },
}));

describe("Repositories page action links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockGetWorkloadName.mockReturnValue("Workload");
    mockGetWorkloadDetail.mockReturnValue({ id: "workload-1", name: "Workload" });
    mockRepoGroups.mockImplementation(() => null);
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

describe("Repositories page repo group filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockGetWorkloadName.mockReturnValue("Workload");
    mockGetWorkloadDetail.mockReturnValue({ id: "workload-1", name: "Workload" });
    mockRepoGroups.mockImplementation(() => null);
  });

  const repos = [
    {
      name: "repo-frontend",
      url: "https://example.com/1",
      workloadId: "workload-1",
      workloadName: "Workload",
      repoGroups: ["frontend"],
    },
    {
      name: "repo-backend",
      url: "https://example.com/2",
      workloadId: "workload-1",
      workloadName: "Workload",
      repoGroups: ["backend"],
    },
    {
      name: "repo-shared",
      url: "https://example.com/3",
      workloadId: "workload-1",
      workloadName: "Workload",
      repoGroups: ["frontend", "backend"],
    },
  ];

  it("renders the RepoGroups filter component", () => {
    mockGetRepositoryDetails.mockReturnValue(repos);

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    expect(screen.getByTestId("repo-groups-filter")).toBeDefined();
  });

  it("shows all repos when no repo group filter is set", () => {
    mockGetRepositoryDetails.mockReturnValue(repos);

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    expect(screen.getByText("repo-frontend")).toBeDefined();
    expect(screen.getByText("repo-backend")).toBeDefined();
    expect(screen.getByText("repo-shared")).toBeDefined();
  });

  it("filters repos to only those matching the selected repo group", () => {
    mockGetRepositoryDetails.mockReturnValue(repos);
    let capturedOnChange: ((groups: string[]) => void) | undefined;
    mockRepoGroups.mockImplementation((props: { onChange?: (groups: string[]) => void }) => {
      capturedOnChange = props.onChange;
      return null;
    });

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    act(() => {
      capturedOnChange!(["frontend"]);
    });

    expect(screen.getByText("repo-frontend")).toBeDefined();
    expect(screen.queryByText("repo-backend")).toBeNull();
    expect(screen.getByText("repo-shared")).toBeDefined();
  });

  it("shows repos matching any of the selected repo groups", () => {
    mockGetRepositoryDetails.mockReturnValue(repos);
    let capturedOnChange: ((groups: string[]) => void) | undefined;
    mockRepoGroups.mockImplementation((props: { onChange?: (groups: string[]) => void }) => {
      capturedOnChange = props.onChange;
      return null;
    });

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    act(() => {
      capturedOnChange!(["backend"]);
    });

    expect(screen.queryByText("repo-frontend")).toBeNull();
    expect(screen.getByText("repo-backend")).toBeDefined();
    expect(screen.getByText("repo-shared")).toBeDefined();
  });

  it("shows no repos when selected repo group matches none", () => {
    mockGetRepositoryDetails.mockReturnValue(repos);
    let capturedOnChange: ((groups: string[]) => void) | undefined;
    mockRepoGroups.mockImplementation((props: { onChange?: (groups: string[]) => void }) => {
      capturedOnChange = props.onChange;
      return null;
    });

    render(
      <MemoryRouter>
        <Repositories />
      </MemoryRouter>
    );

    act(() => {
      capturedOnChange!(["nonexistent-group"]);
    });

    expect(screen.queryByText("repo-frontend")).toBeNull();
    expect(screen.queryByText("repo-backend")).toBeNull();
    expect(screen.queryByText("repo-shared")).toBeNull();
  });
});

describe("Repositories page table linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockGetWorkloadName.mockReturnValue("Workload");
    mockGetWorkloadDetail.mockReturnValue({ id: "workload-1", name: "Workload" });
    mockRepoGroups.mockImplementation(() => null);
  });

  it("repo name links to the repository page with encoded name", () => {
    mockGetRepositoryDetails.mockReturnValue([
      {
        name: "org/my-repo",
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

    const repoLink = screen.getByRole("link", { name: "org/my-repo" });
    expect(repoLink.getAttribute("href")).toBe("/workload/workload-1/repositories/platform/org%2Fmy-repo");
  });

  it("external link is a separate element from the repo name link", () => {
    mockGetRepositoryDetails.mockReturnValue([
      {
        name: "org/my-repo",
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

    // repo name link should NOT have the external URL
    const repoNameLink = screen.getByRole("link", { name: "org/my-repo" });
    expect(repoNameLink.getAttribute("href")).not.toBe("https://example.com/repo");

    // external link should be present (has aria-label)
    const externalLink = screen.getByRole("link", { name: /pages:repositories\.openInSourceControl/i });
    expect(externalLink.getAttribute("href")).toBe("https://example.com/repo");
  });
});
