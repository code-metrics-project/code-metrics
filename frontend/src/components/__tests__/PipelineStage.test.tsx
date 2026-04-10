import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { PipelineStage } from "@/components/inputs/PipelineStage";

const { mockUseConfig } = vi.hoisted(() => ({
  mockUseConfig: vi.fn(),
}));

vi.mock("@/hooks/useConfig", () => ({
  useConfig: () => mockUseConfig(),
}));

function renderPipelineStage(props: React.ComponentProps<typeof PipelineStage>) {
  return render(
    <I18nextProvider i18n={i18n}>
      <PipelineStage {...props} />
    </I18nextProvider>
  );
}

describe("PipelineStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [
            {
              id: "workload-a",
              pipelineStages: ["deploy", "build"],
            },
            {
              id: "workload-b",
              pipelineStages: ["test", "build"],
            },
          ],
        },
      },
      isLoading: false,
    });
  });

  it("renders a dropdown and selects stage from options", () => {
    const onChange = vi.fn();
    renderPipelineStage({ onChange, defaults: "build" });

    const trigger = screen.getByRole("combobox", { name: /pipeline stage/i });
    expect(trigger).toBeTruthy();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "deploy" }));

    expect(onChange).toHaveBeenCalledWith("deploy");
  });

  it("shows no stage message when no stages are configured", () => {
    mockUseConfig.mockReturnValue({
      config: {
        systemConfig: {
          workloads: [],
        },
      },
      isLoading: false,
    });

    renderPipelineStage({});

    expect(screen.getByText("No pipeline stages configured.")).toBeTruthy();
  });
});
