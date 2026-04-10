import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Datastores from "@/pages/admin/Datastores";

const { mockListCollections, mockToastError } = vi.hoisted(() => ({
  mockListCollections: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/services/datastores", () => ({
  listCollections: (...args: unknown[]) => mockListCollections(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  }),
}));

vi.mock("@/components/layout", () => ({
  PageBreadcrumbs: () => null,
}));

describe("Datastores list page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockListCollections.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Datastores />
      </MemoryRouter>
    );

    expect(screen.getByText("pages:admin.datastores.title")).toBeDefined();
  });

  it("renders a table of collections when data loads", async () => {
    mockListCollections.mockResolvedValue(["users", "sessions", "cache"]);

    render(
      <MemoryRouter>
        <Datastores />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("users")).toBeDefined();
    });
    expect(screen.getByText("sessions")).toBeDefined();
    expect(screen.getByText("cache")).toBeDefined();
  });

  it("renders empty state when no collections exist", async () => {
    mockListCollections.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Datastores />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.empty.title")).toBeDefined();
    });
    expect(screen.getByText("pages:admin.datastores.empty.description")).toBeDefined();
  });

  it("shows error toast on load failure", async () => {
    mockListCollections.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <Datastores />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("pages:admin.datastores.toast.loadError");
    });
  });

  it("links each collection to the detail page with encoded name", async () => {
    mockListCollections.mockResolvedValue(["org/my-collection"]);

    render(
      <MemoryRouter>
        <Datastores />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("org/my-collection")).toBeDefined();
    });

    const link = screen.getByRole("link", { name: /pages:admin.datastores.table.actions/i });
    expect(link.getAttribute("href")).toBe("/admin/datastores/detail?name=org%2Fmy-collection");
  });
});
