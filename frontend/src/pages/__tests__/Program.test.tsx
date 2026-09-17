import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Program from "@/pages/Program";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  }),
}));

vi.mock("@/components/layout", () => ({
  PageBreadcrumbs: () => null,
}));

function renderProgram() {
  return render(
    <MemoryRouter>
      <Program />
    </MemoryRouter>
  );
}

function iconForCard(titleKey: string) {
  const title = screen.getByText(titleKey);
  const card = title.closest('[data-slot="card"]');
  expect(card, `expected to find a card for ${titleKey}`).not.toBeNull();
  const icon = card?.querySelector("svg");
  expect(icon, `expected to find an icon svg in the card for ${titleKey}`).not.toBeNull();
  return icon as SVGElement;
}

describe("Program page card icon colours", () => {
  it.each([
    ["metrics", "pages:program.metrics.title", "text-blue-600", "dark:text-blue-400", "from-blue-500/20"],
    ["changes", "pages:program.changes.title", "text-violet-600", "dark:text-violet-400", "from-violet-500/20"],
    ["pipelines", "pages:program.pipelines.title", "text-teal-600", "dark:text-teal-400", "from-teal-500/20"],
    ["quality gates", "pages:program.qualityGates.title", "text-green-600", "dark:text-green-400", "from-green-500/20"],
    ["security", "pages:program.security.title", "text-amber-600", "dark:text-amber-400", "from-amber-500/20"],
    [
      "dependency alerts",
      "pages:program.dependencyAlerts.title",
      "text-red-600",
      "dark:text-red-400",
      "from-red-500/20",
    ],
    [
      "repositories",
      "pages:program.repositories.title",
      "text-orange-600",
      "dark:text-orange-400",
      "from-orange-500/20",
    ],
  ])("%s card icon uses its distinct colour", (_name, titleKey, iconColor, iconDarkColor, containerColor) => {
    renderProgram();
    const icon = iconForCard(titleKey);
    const iconClasses = icon.getAttribute("class") ?? "";
    const containerClasses = icon.parentElement?.getAttribute("class") ?? "";
    expect(iconClasses).toContain(iconColor);
    expect(iconClasses).toContain(iconDarkColor);
    expect(containerClasses).toContain(containerColor);
  });

  it("does not render any card icon in the default primary (grey) colour", () => {
    renderProgram();
    const icons = document.querySelectorAll('[data-slot="card"] svg');
    expect(icons).toHaveLength(7);
    icons.forEach((icon, index) => {
      expect(icon.classList.contains("text-primary"), `icon ${index} should not be grey`).toBe(false);
      const containerClasses = icon.parentElement?.getAttribute("class") ?? "";
      expect(containerClasses, `icon ${index} container should not use a primary gradient`).not.toContain(
        "from-primary"
      );
    });
  });
});

describe("Program page card action links", () => {
  it.each([
    ["metrics", "pages:program.metrics.action", "/program/metrics"],
    ["changes", "pages:program.changes.action", "/program/changes"],
    ["pipelines", "pages:program.pipelines.action", "/program/pipeline-health?executeImmediately=true&branchName=main"],
    ["quality gates", "pages:program.qualityGates.action", "/program/quality-gates"],
    ["security", "pages:program.security.action", "/program/security"],
    ["dependency alerts", "pages:program.dependencyAlerts.action", "/program/dependency-alerts"],
    ["repositories", "pages:program.repositories.action", "/repositories"],
  ])("%s card action links to the expected route", (_name, actionKey, href) => {
    renderProgram();
    const link = screen.getByRole("link", { name: actionKey });
    expect(link.getAttribute("href")).toBe(href);
  });
});
