import { Combobox } from "@/components/ui/combobox";
import { useI18n } from "@/hooks/useI18n";

export interface QueryPickerProps {
  value?: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
}

export function QueryPicker({ value, onChange, multiple = false, disabled = false, label }: QueryPickerProps) {
  const { t } = useI18n();

  // Query types available in the system - using translation keys
  const queryOptions = [
    { value: "bugs-new", label: t("components:query.queryTypes.bugsNew") },
    { value: "bugs-open", label: t("components:query.queryTypes.bugsOpen") },
    { value: "change-failure-rate", label: t("components:query.queryTypes.changeFailureRate") },
    { value: "change-categories", label: t("components:query.queryTypes.changeCategories") },
    { value: "code-coverage", label: t("components:query.queryTypes.codeCoverage") },
    { value: "cyclomatic-complexity", label: t("components:query.queryTypes.cyclomaticComplexity") },
    { value: "deployment-frequency", label: t("components:query.queryTypes.deploymentFrequency") },
    { value: "lead-time-for-changes", label: t("components:query.queryTypes.leadTimeForChanges") },
    { value: "lines-of-code", label: t("components:query.queryTypes.linesOfCode") },
    { value: "non-working-pattern", label: t("components:query.queryTypes.nonWorkingPattern") },
    { value: "pipeline-runs", label: t("components:query.queryTypes.pipelineRuns") },
    { value: "pipeline-success", label: t("components:query.queryTypes.pipelineSuccess") },
    { value: "pipeline-durations", label: t("components:query.queryTypes.pipelineDurations") },
    { value: "production-incidents", label: t("components:query.queryTypes.productionIncidents") },
    { value: "pr-open-time", label: t("components:query.queryTypes.prOpenTime") },
    { value: "pr-size", label: t("components:query.queryTypes.prSize") },
    { value: "repo-churn", label: t("components:query.queryTypes.repoChurn") },
    { value: "time-to-restore-service", label: t("components:query.queryTypes.timeToRestoreService") },
    { value: "vulnerabilities", label: t("components:query.queryTypes.vulnerabilities") },
  ].sort((a, b) => a.label.localeCompare(b.label));

  const displayLabel = label ?? t("components:query.dataSources");

  return (
    <Combobox
      value={value ?? null}
      onChange={onChange}
      options={queryOptions}
      disabled={disabled}
      label={displayLabel}
      multiple={multiple}
    />
  );
}
