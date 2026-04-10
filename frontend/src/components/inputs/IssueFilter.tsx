import { useState, useEffect, useMemo, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIssuePriorities } from "@/services/issues";

type FilterType = "priority";

export interface IssueFilterProps {
  defaults?: Record<string, string>;
  disabled?: boolean;
  filters?: FilterType[];
  priorityLabel?: string;
  onChange?: (value: Record<string, string>) => void;
}

export function IssueFilter({
  defaults = {},
  disabled = false,
  filters = ["priority"],
  priorityLabel = "At/above priority",
  onChange,
}: IssueFilterProps) {
  const hasInitialized = useRef(false);

  // Get priorities from the issues service (consistent with Vue app)
  const priorities = useMemo(() => {
    try {
      return getIssuePriorities().map((p) => ({ value: p.value, label: p.title }));
    } catch {
      return [];
    }
  }, []);

  // Calculate initial value with default priority
  const getInitialValue = () => {
    if (defaults.priority) return defaults;
    if (priorities.length > 0) {
      const defaultPriority = priorities[Math.min(1, priorities.length - 1)]?.value;
      return defaultPriority ? { ...defaults, priority: defaultPriority } : defaults;
    }
    return defaults;
  };

  const [filterValues, setFilterValues] = useState<Record<string, string>>(getInitialValue);

  // Emit initial value on mount when priorities are available
  useEffect(() => {
    if (priorities.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const initialValue = getInitialValue();
      setFilterValues(initialValue);
      onChange?.(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities]);

  const handleChange = (filterType: string, value: string) => {
    const newValue = { ...filterValues, [filterType]: value };
    setFilterValues(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-3">
      {filters.includes("priority") && priorities.length > 0 && (
        <Select
          value={filterValues.priority ?? ""}
          onValueChange={(value) => handleChange("priority", value)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={priorityLabel} />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
