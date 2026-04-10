import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { RepoChanges } from "@/components/RepoChanges";

const { mockFetchForDateRange, mockFetchSummary, mockGetConfig } = vi.hoisted(() => ({
  mockFetchForDateRange: vi.fn(),
  mockFetchSummary: vi.fn(),
  mockGetConfig: vi.fn(),
}));

vi.mock("@/services/changes", () => ({
  fetchForDateRange: (...args: unknown[]) => mockFetchForDateRange(...args),
  fetchSummary: (...args: unknown[]) => mockFetchSummary(...args),
}));

vi.mock("@/config", () => ({
  getConfig: () => mockGetConfig(),
}));

vi.mock("@/utils/date", async () => {
  const actual = await vi.importActual<typeof import("@/utils/date")>("@/utils/date");
  return {
    ...actual,
    walkDateRangeBatched: vi.fn(async (startDate, endDate, _batchDays, callback) => {
      await callback([startDate, endDate], 1);
    }),
  };
});

vi.mock("@/components/inputs/WorkloadNames", () => ({
  WorkloadNames: () => <div data-testid="workload-input" />,
}));

vi.mock("@/components/inputs/RepoGroups", () => ({
  RepoGroups: () => <div data-testid="repo-groups-input" />,
}));

vi.mock("@/components/inputs/DatePicker", () => ({
  DatePicker: () => <div data-testid="date-picker" />,
}));

vi.mock("@/utils/logger", () => ({
  logger: vi.fn(),
}));

const mockChange = {
  key: "repo_abc1234",
  workload: "test-workload",
  repo: "repo",
  date: "2026-02-20T10:00:00.000Z",
  message: "Fix bug",
  commitId: "abc1234",
  links: {},
  commits: [{ id: "abc1234", link: "https://example.com/commit/abc1234" }],
  id: "TICKET-1",
  type: "Bug",
  link: "https://example.com/ticket/TICKET-1",
  title: "Fix bug",
};

function renderRepoChanges() {
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
        <RepoChanges workload="test-workload" />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe("RepoChanges AI summary", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      await i18n.changeLanguage("en");
    });

    mockFetchForDateRange.mockResolvedValue([mockChange]);
    mockGetConfig.mockReturnValue({
      systemConfig: {
        llmEnabled: true,
      },
    });
  });

  it("shows AI generated summary when LLM is enabled", async () => {
    mockFetchSummary.mockResolvedValue({ summary: "Executive summary text" });

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(mockFetchSummary).toHaveBeenCalled();
    });

    expect(mockFetchSummary).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.any(Date),
      expect.any(Date),
      "en"
    );

    await waitFor(() => {
      expect(screen.getByText("AI Generated Executive Summary")).toBeTruthy();
      expect(screen.getByText("Executive summary text")).toBeTruthy();
    });
  });

  it("shows an error when summary generation fails", async () => {
    mockFetchSummary.mockRejectedValue(new Error("failed"));

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(
      () => {
        expect(screen.getByText("Failed to generate AI summary. Please check the LLM configuration.")).toBeTruthy();
      },
      { timeout: 4000 }
    );
  });

  it("does not request AI summary when LLM is disabled", async () => {
    mockGetConfig.mockReturnValue({
      systemConfig: {
        llmEnabled: false,
      },
    });

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(mockFetchForDateRange).toHaveBeenCalled();
    });

    expect(mockFetchSummary).not.toHaveBeenCalled();
    expect(screen.queryByText("AI Generated Executive Summary")).toBeNull();
  });

  it("regenerates summary using the newly selected language", async () => {
    mockFetchSummary.mockResolvedValue({ summary: "Executive summary text" });

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(mockFetchSummary).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Regenerate|Régénérer/ }));
    });

    await waitFor(() => {
      expect(mockFetchSummary).toHaveBeenCalledTimes(2);
    });

    expect(mockFetchSummary).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.any(Date),
      expect.any(Date),
      "fr"
    );
  });

  it("renders no-change summary using client i18n key from API payload", async () => {
    mockFetchForDateRange.mockResolvedValue([]);
    mockFetchSummary.mockResolvedValue({
      summary: "",
      code: "NO_CHANGES",
    });

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(screen.getByText("No changes found for this period.")).toBeTruthy();
    });
  });

  it("reuses cached AI summary for the same payload", async () => {
    mockFetchSummary.mockResolvedValue({ summary: "Executive summary text" });

    renderRepoChanges();

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(mockFetchSummary).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Show changes" }));

    await waitFor(() => {
      expect(mockFetchSummary).toHaveBeenCalledTimes(1);
    });
  });
});
