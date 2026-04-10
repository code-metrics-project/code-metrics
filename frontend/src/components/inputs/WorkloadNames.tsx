import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { useConfig } from "@/hooks/useConfig";

export interface WorkloadNamesProps {
  defaults?: string[];
  multiSelect?: boolean;
  disabled?: boolean;
  onChange?: (workloads: string | string[] | null) => void;
}

export function WorkloadNames({ defaults, multiSelect = true, disabled = false, onChange }: WorkloadNamesProps) {
  const { t } = useTranslation();
  const { config } = useConfig();

  const options = useMemo(() => {
    if (!config?.systemConfig?.workloads) {
      return [];
    }
    const workloadIds = config.systemConfig.workloads.map((w) => w.id);
    workloadIds.sort();
    return workloadIds;
  }, [config]);

  const [workloads, setWorkloads] = useState<string[]>(() => {
    if (defaults && defaults.length > 0) {
      return defaults;
    }
    return [];
  });

  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize workloads when options become available
  const initialWorkloads = useMemo(() => {
    if (options.length > 0 && !hasInitialized) {
      return defaults && defaults.length > 0 ? defaults : [...options];
    }
    return null;
  }, [options, defaults, hasInitialized]);

  // Update workloads and notify parent when initialization is needed
  useEffect(() => {
    if (initialWorkloads) {
      // Defer state updates to avoid cascading renders
      setTimeout(() => {
        setWorkloads(initialWorkloads);
        setHasInitialized(true);
        // Notify parent of initial selection
        onChange?.(multiSelect ? initialWorkloads : (initialWorkloads[0] ?? null));
      }, 0);
    }
  }, [initialWorkloads, multiSelect, onChange]);

  const handleChange = (value: string | string[] | null) => {
    const newValue = Array.isArray(value) ? value : value ? [value] : [];
    setWorkloads(newValue);
    onChange?.(multiSelect ? newValue : value);
  };

  return (
    <Combobox
      value={multiSelect ? workloads : (workloads[0] ?? null)}
      options={options}
      onChange={handleChange}
      label={multiSelect ? t("components:inputs.labels.workloads") : t("components:inputs.dimensions.workload")}
      multiple={multiSelect}
      disabled={disabled}
      showSelectAll
    />
  );
}
