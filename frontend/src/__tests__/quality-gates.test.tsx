import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import QualityGates from "@/pages/QualityGates";
import { Paths } from "@/router/paths";

const { mockUseQualityGates, mockGetWorkloadName } = vi.hoisted(() => ({
  mockUseQualityGates: vi.fn(),
  mockGetWorkloadName: vi.fn<(workloadId?: string | null) => string>(),
}));

vi.mock("@/queries/useQualityGates", () => ({
  useQualityGates: (...args: unknown[]) => mockUseQualityGates(...args),
}));

vi.mock("@/services/workload", () => ({
  getWorkloadName: mockGetWorkloadName,
}));

describe("QualityGates page", () => {
  const renderComponent = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[Paths.WorkloadQualityGates.replace(":workloadId", "friendly-workload")]}>
          <Routes>
            <Route path={Paths.WorkloadQualityGates} element={<QualityGates />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    );

  beforeEach(() => {
    mockUseQualityGates.mockReset();
    mockGetWorkloadName.mockReset();
  });

  it("shows friendly workload names in repo group cards", () => {
    const friendlyName = "Payments Platform";
    mockGetWorkloadName.mockReturnValue(friendlyName);
    mockUseQualityGates.mockReturnValue({
      data: [
        {
          workloadId: "friendly-workload",
          repoGroups: [
            {
              repoGroup: "core-services",
              headline: {
                numerator: 3,
                denominator: 4,
                missing: 0,
                variant: "success",
              },
              repos: [],
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderComponent();

    expect(mockGetWorkloadName).toHaveBeenCalledWith("friendly-workload");
    expect(screen.getByText(`${friendlyName} / core-services`)).toBeDefined();
  });
});
