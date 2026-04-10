import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { useConfig } from "@/hooks/useConfig";

export interface BranchNamesProps {
  defaults?: string[];
  disabled?: boolean;
  onChange?: (value: string[]) => void;
}

export function BranchNames({ defaults = [], disabled = false, onChange }: BranchNamesProps) {
  const { t } = useTranslation();
  const { config } = useConfig();
  const [branches, setBranches] = useState<string[]>(defaults);

  const options: string[] = config?.systemConfig?.branches ?? [];

  const handleChange = (value: string | string[] | null) => {
    const newValue = Array.isArray(value) ? value : value ? [value] : [];
    setBranches(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-1">
      <Combobox
        label={t("components:inputs.labels.branches")}
        value={branches}
        options={options.map((branch: string) => ({ value: branch, label: branch }))}
        placeholder={t("components:inputs.selectBranches")}
        disabled={disabled}
        multiple
        onChange={handleChange}
      />
    </div>
  );
}
