import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DatastoreDetail from "@/pages/admin/DatastoreDetail";

const { mockCheckCollectionExists, mockCountCollectionItems, mockEmptyCollection, mockToastSuccess, mockToastError } =
  vi.hoisted(() => ({
    mockCheckCollectionExists: vi.fn(),
    mockCountCollectionItems: vi.fn(),
    mockEmptyCollection: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }));

vi.mock("@/services/datastores", () => ({
  checkCollectionExists: (...args: unknown[]) => mockCheckCollectionExists(...args),
  countCollectionItems: (...args: unknown[]) => mockCountCollectionItems(...args),
  emptyCollection: (...args: unknown[]) => mockEmptyCollection(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
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

function renderWithName(name: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/datastores/detail?name=${encodeURIComponent(name)}`]}>
      <DatastoreDetail />
    </MemoryRouter>
  );
}

describe("DatastoreDetail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks collection existence on load", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(mockCheckCollectionExists).toHaveBeenCalledWith("my-collection");
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });
  });

  it("shows exists=No when collection does not exist", async () => {
    mockCheckCollectionExists.mockResolvedValue(false);

    renderWithName("missing-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsNo")).toBeDefined();
    });
  });

  it("shows error toast when exists check fails", async () => {
    mockCheckCollectionExists.mockRejectedValue(new Error("Network error"));

    renderWithName("bad-collection");

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("pages:admin.datastores.detail.toast.existsError");
    });
  });

  it("does not auto-trigger count on load", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    expect(mockCountCollectionItems).not.toHaveBeenCalled();
    expect(screen.getByText("pages:admin.datastores.detail.countNotChecked")).toBeDefined();
  });

  it("counts items when Count Items button is clicked", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);
    mockCountCollectionItems.mockResolvedValue(42);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    const countButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.countButton/i });
    fireEvent.click(countButton);

    await waitFor(() => {
      expect(mockCountCollectionItems).toHaveBeenCalledWith("my-collection");
    });
    expect(screen.getByText("42")).toBeDefined();
  });

  it("shows error toast when count fails", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);
    mockCountCollectionItems.mockRejectedValue(new Error("Timeout"));

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    const countButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.countButton/i });
    fireEvent.click(countButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("pages:admin.datastores.detail.toast.countError");
    });
  });

  it("opens empty confirmation dialog when empty button is clicked", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    const emptyButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.emptyButton/i });
    fireEvent.click(emptyButton);

    expect(screen.getByText("pages:admin.datastores.detail.emptyDialog.title")).toBeDefined();
    expect(screen.getByText("pages:admin.datastores.detail.emptyDialog.description")).toBeDefined();
    expect(screen.getByText("pages:admin.datastores.detail.emptyDialog.warning")).toBeDefined();
  });

  it("empties collection when confirmed in dialog", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);
    mockEmptyCollection.mockResolvedValue(undefined);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    // Open dialog
    const emptyButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.emptyButton/i });
    fireEvent.click(emptyButton);

    // Confirm
    const confirmButton = screen.getByRole("button", {
      name: /pages:admin.datastores.detail.emptyDialog.submitButton/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockEmptyCollection).toHaveBeenCalledWith("my-collection");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("pages:admin.datastores.detail.toast.emptySuccess");
  });

  it("shows error toast when empty fails", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);
    mockEmptyCollection.mockRejectedValue(new Error("Permission denied"));

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    const emptyButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.emptyButton/i });
    fireEvent.click(emptyButton);

    const confirmButton = screen.getByRole("button", {
      name: /pages:admin.datastores.detail.emptyDialog.submitButton/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("pages:admin.datastores.detail.toast.emptyError");
    });
  });

  it("displays the collection name from query params", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);

    renderWithName("test-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    // The collection name appears in the card title and as the name value
    const nameElements = screen.getAllByText("test-collection");
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
  });

  it("resets count after emptying collection", async () => {
    mockCheckCollectionExists.mockResolvedValue(true);
    mockCountCollectionItems.mockResolvedValue(42);
    mockEmptyCollection.mockResolvedValue(undefined);

    renderWithName("my-collection");

    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.existsYes")).toBeDefined();
    });

    // Count first
    const countButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.countButton/i });
    fireEvent.click(countButton);

    await waitFor(() => {
      expect(screen.getByText("42")).toBeDefined();
    });

    // Now empty
    const emptyButton = screen.getByRole("button", { name: /pages:admin.datastores.detail.emptyButton/i });
    fireEvent.click(emptyButton);

    const confirmButton = screen.getByRole("button", {
      name: /pages:admin.datastores.detail.emptyDialog.submitButton/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockEmptyCollection).toHaveBeenCalledWith("my-collection");
    });

    // Count should be reset to "not checked"
    await waitFor(() => {
      expect(screen.getByText("pages:admin.datastores.detail.countNotChecked")).toBeDefined();
    });
  });
});
