import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAsyncCMQuery } from "@/queries/useAsyncCMQuery";
import * as asyncQueryService from "@/services/asyncQuery";

vi.mock("@/services/asyncQuery", () => ({
  submitAsyncQuery: vi.fn(),
  pollForResult: vi.fn(),
}));

describe("useAsyncCMQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("submits query and polls for result", async () => {
    vi.mocked(asyncQueryService.submitAsyncQuery).mockResolvedValue({
      jobId: "job-123",
      pollUrl: "/api/query/async/job-123",
    });
    vi.mocked(asyncQueryService.pollForResult).mockResolvedValue(new Map([["workload1", { entries: new Map() }]]));

    const { result } = renderHook(
      () => useAsyncCMQuery({ queryName: "test", args: {} }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(asyncQueryService.submitAsyncQuery).toHaveBeenCalledWith({ queryName: "test", args: {} });
    expect(asyncQueryService.pollForResult).toHaveBeenCalledWith("job-123");
  });

  it("does not execute when disabled", async () => {
    const { result } = renderHook(
      () => useAsyncCMQuery({ queryName: "test", args: {} }, false),
      { wrapper }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.isLoading).toBe(false);
    expect(asyncQueryService.submitAsyncQuery).not.toHaveBeenCalled();
  });
});
