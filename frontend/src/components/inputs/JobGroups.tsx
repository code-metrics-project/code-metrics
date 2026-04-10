import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { useConfig } from "@/hooks/useConfig";

export interface JobGroupsProps {
  /** Current selected values (controlled) */
  value?: string[];
  /** @deprecated Use value instead. Fallback for uncontrolled usage. */
  defaults?: string[];
  /** Optional: pass job group options directly (avoids config timing issues) */
  options?: string[];
  disabled?: boolean;
  onChange?: (value: string[]) => void;
}

export function JobGroups({ value, defaults = [], options: optionsProp, disabled = false, onChange }: JobGroupsProps) {
  const { t } = useTranslation();
  const { config } = useConfig();

  // Extract unique job group names from all workloads
  const optionsFromConfig = useMemo<string[]>(() => {
    const allJobGroups = new Set<string>();
    const workloads = config?.systemConfig?.workloads ?? [];
    for (const workload of workloads) {
      if (workload.jobs) {
        for (const groupName of Object.keys(workload.jobs)) {
          allJobGroups.add(groupName);
        }
      }
    }
    return Array.from(allJobGroups).sort();
  }, [config?.systemConfig?.workloads]);

  // Use prop if provided, otherwise derive from config
  const options = optionsProp ?? optionsFromConfig;

  // Use controlled value, fall back to defaults for backwards compatibility
  const selectedValue = value ?? defaults;

  const handleChange = (newValue: string | string[] | null) => {
    const arrayValue = Array.isArray(newValue) ? newValue : newValue ? [newValue] : [];
    onChange?.(arrayValue);
  };

  return (
    <div className="space-y-1">
      <Combobox
        label={t("components:inputs.labels.jobGroups")}
        value={selectedValue}
        options={options.map((group: string) => ({ value: group, label: group }))}
        placeholder={t("components:inputs.selectJobGroups")}
        disabled={disabled}
        multiple
        onChange={handleChange}
      />
    </div>
  );
}
