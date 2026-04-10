import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { getJobsForWorkloadId, listWorkloadIds } from "@/config";

export interface JobNamesProps {
  /** Current selected values (controlled) */
  value?: string[];
  /** @deprecated Use value instead. Fallback for uncontrolled usage. */
  defaults?: string[];
  /** Optional: filter jobs to specific workloads */
  workloadIds?: string[];
  disabled?: boolean;
  onChange?: (value: string[]) => void;
}

export function JobNames({ value, defaults = [], workloadIds = [], disabled = false, onChange }: JobNamesProps) {
  const { t } = useTranslation();
  // Get all job names from workloads, or all workloads if none specified
  const options = useMemo<string[]>(() => {
    const workloadIdsToQuery = workloadIds.length > 0 ? workloadIds : listWorkloadIds();
    const allJobs = workloadIdsToQuery.flatMap((workloadId) => getJobsForWorkloadId(workloadId));
    return [...new Set(allJobs)].sort();
  }, [workloadIds]);

  // Use controlled value, fall back to defaults for backwards compatibility
  const selectedValue = value ?? defaults;

  const handleChange = (newValue: string | string[] | null) => {
    const arrayValue = Array.isArray(newValue) ? newValue : newValue ? [newValue] : [];
    onChange?.(arrayValue);
  };

  return (
    <div className="space-y-1">
      <Combobox
        label={t("components:inputs.labels.jobNames")}
        value={selectedValue}
        options={options.map((job: string) => ({ value: job, label: job }))}
        placeholder={t("components:inputs.selectJobNames")}
        disabled={disabled}
        multiple
        onChange={handleChange}
      />
    </div>
  );
}
