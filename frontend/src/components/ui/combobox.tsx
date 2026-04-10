import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export type ComboboxOption = string | { value: string; label: string; disabled?: boolean };

export interface ComboboxProps {
  value: string | string[] | null;
  options: ComboboxOption[];
  onChange: (value: string | string[] | null) => void;
  placeholder?: string;
  label?: string;
  multiple?: boolean;
  disabled?: boolean;
  showSelectAll?: boolean;
  className?: string;
  /** Optional stable id for a11y linking. If omitted, a unique id is generated. */
  id?: string;
}

export function Combobox({
  value,
  options,
  onChange,
  placeholder,
  label = "",
  multiple = false,
  disabled = false,
  showSelectAll = false,
  className,
  id,
}: ComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const reactId = React.useId();
  const baseId = id ?? reactId;
  const triggerId = `${baseId}-trigger`;
  const labelId = label ? `${baseId}-label` : undefined;
  const listboxId = `${baseId}-listbox`;

  // Normalize options to always have value/label structure
  const normalizedOptions = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt, disabled: false };
      }
      return { value: opt.value, label: opt.label, disabled: opt.disabled ?? false };
    });
  }, [options]);

  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return normalizedOptions;
    const query = searchQuery.toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [searchQuery, normalizedOptions]);

  const defaultPlaceholder = placeholder ?? t("components:inputs.select");

  const displayText = React.useMemo(() => {
    if (selectedValues.length === 0) return defaultPlaceholder;
    if (!multiple) {
      const selected = normalizedOptions.find((opt) => opt.value === selectedValues[0]);
      return selected?.label || selectedValues[0];
    }
    return null;
  }, [selectedValues, multiple, normalizedOptions, defaultPlaceholder]);

  function getLabel(val: string): string {
    const opt = normalizedOptions.find((o) => o.value === val);
    return opt?.label || val;
  }

  function isSelected(val: string) {
    return selectedValues.includes(val);
  }

  function toggleOption(val: string) {
    if (multiple) {
      const current = [...selectedValues];
      const index = current.indexOf(val);
      if (index >= 0) {
        current.splice(index, 1);
      } else {
        current.push(val);
      }
      onChange(current);
    } else {
      onChange(val);
      setOpen(false);
    }
  }

  function removeValue(val: string, event: React.MouseEvent) {
    event.stopPropagation();
    if (multiple) {
      const newValue = selectedValues.filter((v) => v !== val);
      onChange(newValue);
    }
  }

  // Select All functionality
  const allSelected = React.useMemo(() => {
    const enabledOptions = normalizedOptions.filter((opt) => !opt.disabled);
    return enabledOptions.length > 0 && enabledOptions.every((opt) => selectedValues.includes(opt.value));
  }, [normalizedOptions, selectedValues]);

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      const allValues = normalizedOptions.filter((opt) => !opt.disabled).map((opt) => opt.value);
      onChange(allValues);
    }
  }

  // Clear search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label id={labelId} htmlFor={triggerId} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? listboxId : undefined}
            aria-labelledby={labelId ? `${labelId} ${triggerId}` : undefined}
            aria-label={!labelId ? label || placeholder : undefined}
            className="min-h-10 w-full justify-between"
            disabled={disabled}
          >
            {multiple && selectedValues.length > 0 ? (
              <div className="flex max-w-[90%] flex-wrap gap-1">
                {selectedValues.slice(0, 3).map((val) => (
                  <Badge key={val} variant="secondary" className="flex items-center gap-0.5 text-xs">
                    <span>{getLabel(val)}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${getLabel(val)}`}
                      className="ring-offset-background focus:ring-ring ml-0.5 cursor-pointer rounded-full outline-none hover:opacity-70 focus:ring-2 focus:ring-offset-2"
                      onClick={(e) => removeValue(val, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          removeValue(val, e as unknown as React.MouseEvent);
                        }
                      }}
                    >
                      <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
                    </span>
                  </Badge>
                ))}
                {selectedValues.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedValues.length - 3} more
                  </Badge>
                )}
              </div>
            ) : (
              <span className={cn(!selectedValues.length && "text-muted-foreground")}>{displayText}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={t("components:inputs.search")}
              aria-label={label ? t("components:inputs.searchLabel", { label }) : t("common:search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          {showSelectAll && multiple && (
            <div
              role="button"
              tabIndex={0}
              aria-pressed={allSelected}
              className="hover:bg-accent mx-2 mb-1 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5"
              onClick={toggleAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleAll();
                }
              }}
            >
              <Checkbox checked={allSelected} />
              <span className="text-sm font-medium">{t("components:inputs.selectAll")}</span>
            </div>
          )}
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="max-h-60 overflow-y-auto"
          >
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected(opt.value)}
                aria-disabled={opt.disabled || undefined}
                tabIndex={opt.disabled ? -1 : 0}
                className={cn(
                  "mx-2 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5",
                  opt.disabled && "cursor-not-allowed opacity-50",
                  !opt.disabled && "hover:bg-accent"
                )}
                onClick={() => !opt.disabled && toggleOption(opt.value)}
                onKeyDown={(event) => {
                  if (opt.disabled) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleOption(opt.value);
                  }
                }}
              >
                {multiple ? (
                  <Checkbox checked={isSelected(opt.value)} disabled={opt.disabled} />
                ) : (
                  <Check className={cn("h-4 w-4", isSelected(opt.value) ? "opacity-100" : "opacity-0")} />
                )}
                <span className="text-sm">{opt.label}</span>
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">No options found</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
