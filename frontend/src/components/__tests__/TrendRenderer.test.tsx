import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendRenderer } from "@/components/dashboard/renderers/TrendRenderer";
import type { DatedMetrics } from "@/model/metrics";

function metrics(entries: Array<[string, number]>, date: string): DatedMetrics {
  return {
    entries: new Map(entries.map(([key, value]) => [key, { date, value }])),
  };
}

describe("TrendRenderer", () => {
  it("shows success/aborted/failed totals for multi-series pipeline-runs data", () => {
    const data = new Map<string, DatedMetrics>([
      [
        "2026-03-01",
        metrics(
          [
            ["runs-successful", 3],
            ["runs-aborted", 1],
            ["runs-failed", 2],
          ],
          "2026-03-01"
        ),
      ],
      [
        "2026-03-02",
        metrics(
          [
            ["runs-successful", 4],
            ["runs-aborted", 0],
            ["runs-failed", 1],
          ],
          "2026-03-02"
        ),
      ],
    ]);

    render(<TrendRenderer data={data} />);

    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByText("Aborted")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText(/Week ending/i)).toBeTruthy();

    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("formats coverage as one decimal place with percentage", () => {
    const data = new Map<string, DatedMetrics>([
      ["2026-03-01", metrics([["coverage", 83.456]], "2026-03-01")],
      ["2026-03-02", metrics([["coverage", 84.012]], "2026-03-02")],
    ]);

    render(<TrendRenderer data={data} />);

    expect(screen.getByText("83.5%")).toBeTruthy();
  });

  it("rounds open bugs to nearest whole number", () => {
    const data = new Map<string, DatedMetrics>([
      ["2026-03-01", metrics([["open-bugs", 10.6]], "2026-03-01")],
      ["2026-03-02", metrics([["open-bugs", 11.2]], "2026-03-02")],
    ]);

    render(<TrendRenderer data={data} />);

    expect(screen.getByText("11")).toBeTruthy();
  });

  it("keeps existing week-ending trend view for single-series data", () => {
    const data = new Map<string, DatedMetrics>([
      ["2026-03-01", metrics([["run-success", 80]], "2026-03-01")],
      ["2026-03-02", metrics([["run-success", 90]], "2026-03-02")],
    ]);

    render(<TrendRenderer data={data} />);

    expect(screen.getByText("Week ending")).toBeTruthy();
  });

  it("normalises suffixed pipeline labels and keeps Success, Aborted, Failed order", () => {
    const data = new Map<string, DatedMetrics>([
      [
        "2026-03-02",
        metrics(
          [
            ["runs-aborted/gaia", 5],
            ["runs-failed/gaia", 4],
            ["runs-successful/gaia", 9],
          ],
          "2026-03-02"
        ),
      ],
    ]);

    render(<TrendRenderer data={data} />);

    const labels = screen.getAllByText(/Success|Aborted|Failed/).map((el) => el.textContent);
    expect(labels).toEqual(["Success", "Aborted", "Failed"]);
  });
});
