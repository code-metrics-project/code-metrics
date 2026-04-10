import { useTranslation } from "react-i18next";
import { DatePicker } from "./DatePicker";

export interface EndDatePickerProps {
  defaults?: Date;
  disabled?: boolean;
  onChange?: (value: Date | undefined) => void;
}

export function EndDatePicker({ defaults, disabled = false, onChange }: EndDatePickerProps) {
  const { t } = useTranslation();
  return (
    <DatePicker
      value={defaults}
      onChange={(d) => onChange?.(d)}
      label={t("components:inputs.labels.endDate")}
      disabled={disabled}
      showPresets={true}
    />
  );
}
