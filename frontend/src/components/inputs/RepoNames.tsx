import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";

export interface RepoNamesProps {
  defaults?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  repos?: string[];
}

export function RepoNames({ defaults = "", disabled = false, onChange, repos = [] }: RepoNamesProps) {
  const { t } = useTranslation();
  return (
    <Combobox
      label={t("components:inputs.labels.repositoryName")}
      options={repos.map((r) => ({ value: r, label: r }))}
      value={defaults}
      onChange={(v) => onChange?.(v as string)}
      multiple={false}
      disabled={disabled}
    />
  );
}
