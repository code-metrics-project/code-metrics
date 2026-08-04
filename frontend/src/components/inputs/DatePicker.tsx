import { useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getOffsetDate } from "@/utils/date";
import { useI18n } from "@/hooks/useI18n";

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Show date preset buttons (7, 30, 90 days ago) */
  showPresets?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  disabled = false,
  className,
  showPresets = true,
}: DatePickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const setRelativeDate = useCallback(
    (dayOffset: number) => {
      const newDate = getOffsetDate(dayOffset);
      onChange(newDate);
      setOpen(false);
    },
    [onChange]
  );

  const formattedDate = value ? format(value, "yyyy-MM-dd") : undefined;

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formattedDate ?? <span>{t("components:datePicker.pickDate")}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="flex flex-col items-center p-3">
            <Calendar mode="single" selected={value} onSelect={onChange} autoFocus captionLayout="dropdown" />
            {showPresets && (
              <div className="border-border mt-3 flex w-full justify-center gap-2 border-t pt-3">
                <Button variant="secondary" size="sm" onClick={() => setRelativeDate(-7)}>
                  {t("components:datePicker.daysAgo7")}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setRelativeDate(-30)}>
                  {t("components:datePicker.daysAgo30")}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setRelativeDate(-90)}>
                  {t("components:datePicker.daysAgo90")}
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
