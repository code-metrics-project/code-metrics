import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { WorkloadIcon, WORKLOAD_ICON_NAMES } from "@/components/WorkloadIcon";

describe("WorkloadIcon", () => {
  it("renders the configured lucide icon", () => {
    const { container } = render(<WorkloadIcon icon="rocket" color="#0369a1" />);
    const svg = container.querySelector<SVGElement>("svg.lucide-rocket");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("fill")).toBe("none");
    expect(svg?.style.color).toBe("rgb(3, 105, 161)");
  });

  it("resolves icon names case-insensitively", () => {
    const { container } = render(<WorkloadIcon icon="Rocket" color="#0369a1" />);
    expect(container.querySelector<SVGElement>("svg.lucide-rocket")).not.toBeNull();
  });

  it("falls back to a filled circle when no icon is configured", () => {
    const { container } = render(<WorkloadIcon color="#e11d48" />);
    const svg = container.querySelector<SVGElement>("svg.lucide-circle");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("fill")).toBe("#e11d48");
  });

  it("falls back to a filled circle for unrecognised icon names", () => {
    const { container } = render(<WorkloadIcon icon="not-a-real-icon" color="#e11d48" />);
    const svg = container.querySelector<SVGElement>("svg.lucide-circle");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("fill")).toBe("#e11d48");
  });

  it("falls back to a filled circle for empty icon names", () => {
    const { container } = render(<WorkloadIcon icon="" color="#e11d48" />);
    expect(container.querySelector<SVGElement>("svg.lucide-circle")).not.toBeNull();
  });

  it("passes the class name through to the icon", () => {
    const { container } = render(<WorkloadIcon icon="server" color="#0369a1" className="h-5 w-5" />);
    const svg = container.querySelector<SVGElement>("svg.lucide-server");
    expect(svg?.classList.contains("h-5")).toBe(true);
    expect(svg?.classList.contains("w-5")).toBe(true);
  });

  it("only supports a curated set of icon names", () => {
    expect(WORKLOAD_ICON_NAMES).toContain("rocket");
    expect(WORKLOAD_ICON_NAMES).toContain("circle");
    expect(WORKLOAD_ICON_NAMES).not.toContain("not-a-real-icon");
    expect(new Set(WORKLOAD_ICON_NAMES).size).toBe(WORKLOAD_ICON_NAMES.length);
  });
});
