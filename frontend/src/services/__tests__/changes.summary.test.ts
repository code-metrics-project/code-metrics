import { describe, expect, it, vi, beforeEach } from "vitest";
import client from "@/api/client";
import { fetchSummary } from "@/services/changes";
import { REPO_CHANGES_SUMMARY } from "@/api/endpoints";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("changes summary service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns summary text from the API response", async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: { summary: "Summary text", code: undefined },
      status: 200,
    });

    const result = await fetchSummary(
      ["workload-a"],
      ["group-a"],
      new Date("2026-02-01"),
      new Date("2026-02-10"),
      "fr"
    );

    expect(client.get).toHaveBeenCalledWith(REPO_CHANGES_SUMMARY, {
      params: {
        workloads: "workload-a",
        repoGroups: "group-a",
        startDate: "2026-02-01",
        endDate: "2026-02-10",
        language: "fr",
      },
    });
    expect(result).toEqual({ summary: "Summary text", code: undefined });
  });

  it("returns coded no-change payload for client-side localization", async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        summary: "",
        code: "NO_CHANGES",
      },
      status: 200,
    });

    const result = await fetchSummary(["workload-a"], ["group-a"], new Date("2026-02-01"), new Date("2026-02-10"));

    expect(result).toEqual({
      summary: "",
      code: "NO_CHANGES",
    });
  });

  it("throws when the API call fails", async () => {
    vi.mocked(client.get).mockRejectedValue(new Error("network error"));

    await expect(fetchSummary(["workload-a"], [], new Date("2026-02-01"), new Date("2026-02-10"))).rejects.toThrow(
      "network error"
    );
  });
});
