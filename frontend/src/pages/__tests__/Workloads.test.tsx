import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Workloads from "@/pages/Workloads";
import type { WorkloadDetail } from "@/model/config";

const { mockGetWorkloadDetails } = vi.hoisted(() => ({
  mockGetWorkloadDetails: vi.fn(),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  }),
}));

vi.mock("@/services/workload", () => ({
  getWorkloadDetails: (...args: unknown[]) => mockGetWorkloadDetails(...args),
}));

const workloads: WorkloadDetail[] = [
  {
    id: "athena",
    name: "Athena",
    color: "#123456",
    repos: { backend: 2 },
  },
  {
    id: "hermes",
    name: "Hermes",
    color: "#654321",
    repos: { frontend: 1 },
  },
  {
    id: "apollo",
    name: "Apollo",
    color: "#112233",
    repos: { infra: 0 },
  },
];

describe("Workloads page links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkloadDetails.mockReturnValue(workloads);
  });

  it("view repositories links target the workload repositories path with the id substituted", () => {
    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    const reposLinks = screen.getAllByRole("link", { name: "components:viewRepositories" });
    expect(reposLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/workload/athena/repositories",
      "/workload/hermes/repositories",
      "/workload/apollo/repositories",
    ]);
  });

  it("view repositories links carry no query string", () => {
    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    for (const link of screen.getAllByRole("link", { name: "components:viewRepositories" })) {
      const href = link.getAttribute("href")!;
      expect(href).not.toContain("?");
      expect(new URL(href, "http://localhost").searchParams.has("workloadId")).toBe(false);
    }
  });

  it("view workload links target the workload health path", () => {
    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    const workloadLinks = screen.getAllByRole("link", { name: /components:viewWorkload/ });
    expect(workloadLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/workload/athena",
      "/workload/hermes",
      "/workload/apollo",
    ]);
  });

  it("renders no link containing an unreplaced route parameter", () => {
    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    for (const href of hrefs) {
      expect(href).not.toMatch(/:[a-zA-Z][a-zA-Z0-9]*/);
    }
  });

  it("renders a workload card for each workload", () => {
    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    expect(screen.getByText("Athena")).toBeDefined();
    expect(screen.getByText("Hermes")).toBeDefined();
  });
});

describe("Workloads page workload icons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the configured icon for a workload", () => {
    mockGetWorkloadDetails.mockReturnValue([
      { id: "athena", name: "Athena", icon: "rocket", color: "#0369a1", repos: { backend: 2 } },
    ]);

    const { container } = render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    const svg = container.querySelector("svg.lucide-rocket") as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg.style.color).toBe("rgb(3, 105, 161)");
    expect(container.querySelector("svg.lucide-circle")).toBeNull();
  });

  it("falls back to a filled circle when a workload has no icon", () => {
    mockGetWorkloadDetails.mockReturnValue([{ id: "athena", name: "Athena", color: "#0369a1", repos: {} }]);

    const { container } = render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    const svg = container.querySelector("svg.lucide-circle") as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("fill")).toBe("#0369a1");
  });

  it("shows a repo count per repo group", () => {
    mockGetWorkloadDetails.mockReturnValue([
      { id: "athena", name: "Athena", icon: "rocket", color: "#0369a1", repos: { backend: 2, platform: 0 } },
    ]);

    render(
      <MemoryRouter>
        <Workloads />
      </MemoryRouter>
    );

    expect(screen.getByText("backend")).toBeDefined();
    expect(screen.getByText("2 repos")).toBeDefined();
    expect(screen.getByText("platform")).toBeDefined();
    expect(screen.getByText("No repos")).toBeDefined();
  });
});
