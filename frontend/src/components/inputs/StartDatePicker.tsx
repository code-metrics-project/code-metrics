import { useTranslation } from "react-i18next";
import { DatePicker } from "./DatePicker";

export interface StartDatePickerProps {
  defaults?: Date;
  disabled?: boolean;
  onChange?: (value: Date | undefined) => void;
}

export function StartDatePicker({ defaults, disabled = false, onChange }: StartDatePickerProps) {
  const { t } = useTranslation();
  return (
    <DatePicker
      value={defaults}
      onChange={(d) => onChange?.(d)}
      label={t("components:inputs.labels.startDate")}
      disabled={disabled}
      showPresets={true}
    />
  );
}
