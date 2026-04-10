import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SEVERITY_LEVELS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

export interface SeverityOptionsProps {
  defaults?: Record<string, boolean>;
  disabled?: boolean;
  onChange?: (value: Record<string, boolean>) => void;
}

export function SeverityOptions({ defaults = {}, disabled = false, onChange }: SeverityOptionsProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<Record<string, boolean>>(defaults);

  const handleChange = (severity: string, checked: boolean) => {
    const newValue = { ...selectedSeverities, [severity]: checked };
    setSelectedSeverities(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Severity</div>
      <div className="flex flex-wrap gap-4">
        {SEVERITY_LEVELS.map((level) => (
          <div key={level.value} className="flex items-center gap-2">
            <Checkbox
              id={`severity-${level.value}`}
              checked={selectedSeverities[level.value] ?? false}
              onCheckedChange={(checked) => handleChange(level.value, checked === true)}
              disabled={disabled}
            />
            <Label htmlFor={`severity-${level.value}`} className="text-sm">
              {level.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
