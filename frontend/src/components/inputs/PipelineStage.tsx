import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useConfig } from "@/hooks/useConfig";
import { useI18n } from "@/hooks/useI18n";

export interface PipelineStageProps {
  /** Current selected value (controlled) */
  value?: string;
  /** @deprecated Use value instead. Fallback for uncontrolled usage. */
  defaults?: string;
  /** Optional: pass stages directly to avoid timing issues with config loading */
  stages?: string[];
  disabled?: boolean;
  onChange?: (value: string | undefined) => void;
}

export function PipelineStage({ value, defaults, stages: stagesProp, disabled = false, onChange }: PipelineStageProps) {
  const { t } = useI18n();
  const { config } = useConfig();

  // Extract unique pipeline stages from all workloads (used if stages prop not provided)
  const stagesFromConfig = useMemo<string[]>(() => {
    const allStages = new Set<string>();
    const workloads = config?.systemConfig?.workloads ?? [];
    for (const workload of workloads) {
      if (workload.pipelineStages) {
        for (const stage of workload.pipelineStages) {
          allStages.add(stage);
        }
      }
    }
    return Array.from(allStages).sort();
  }, [config?.systemConfig?.workloads]);

  // Use prop if provided, otherwise derive from config
  const stages = stagesProp ?? stagesFromConfig;

  // Use controlled value, fall back to defaults for backwards compatibility
  const selectedValue = value ?? defaults;

  const handleChange = (newValue: string | string[] | null) => {
    if (!newValue || Array.isArray(newValue)) {
      onChange?.(undefined);
      return;
    }
    if (newValue !== selectedValue) {
      onChange?.(newValue);
    }
  };

  if (stages.length === 0) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("components:filters.pipelineStage")}</label>
        <p className="text-muted-foreground text-sm">{t("components:filters.noPipelineStages")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Combobox
        label={t("components:filters.pipelineStage")}
        value={selectedValue ?? null}
        options={stages}
        disabled={disabled}
        multiple={false}
        onChange={handleChange}
      />
    </div>
  );
}
