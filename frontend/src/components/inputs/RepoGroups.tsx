import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import { listRepoGroups } from "@/config";

export interface RepoGroupsProps {
  defaults?: string[];
  disabled?: boolean;
  onChange?: (repoGroups: string[]) => void;
  skipDefaultSelection?: boolean;
}

export function RepoGroups({ defaults, disabled = false, onChange, skipDefaultSelection = false }: RepoGroupsProps) {
  const { t } = useTranslation();
  const options = useMemo(() => {
    try {
      return listRepoGroups();
    } catch {
      return [];
    }
  }, []);

  const [repoGroups, setRepoGroups] = useState<string[]>(() => {
    if (defaults && defaults.length > 0) {
      return defaults;
    }
    // Skip auto-selecting all if explicitly told to (e.g., when repoName is provided)
    if (skipDefaultSelection) {
      return [];
    }
    // Default to all repo groups selected
    return [...options];
  });

  const handleChange = (value: string | string[] | null) => {
    const newValue = Array.isArray(value) ? value : value ? [value] : [];
    setRepoGroups(newValue);
    onChange?.(newValue);
  };

  useEffect(() => {
    // Only emit initial value on mount if we have selections to emit
    // Skip if defaults was empty and we're not auto-selecting
    if (repoGroups.length > 0) {
      onChange?.(repoGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Combobox
      value={repoGroups}
      options={options}
      onChange={handleChange}
      label={t("components:inputs.labels.repositoryGroups")}
      multiple
      disabled={disabled}
      showSelectAll
    />
  );
}
