import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TransformerComponentProps, TransformerArgs } from "./transform";
import { useI18n } from "@/hooks/useI18n";

const MODELS = ["weighted", "simple"];

interface RollingAveragesArgs {
  days: number;
  model: string;
  removeOutliers: boolean;
}

export function RollingAverages({ value, onChange, disabled = false }: TransformerComponentProps) {
  const { t } = useI18n();
  const [removeOutliers, setRemoveOutliers] = useState<boolean>((value?.removeOutliers as boolean) ?? false);
  const [days, setDays] = useState<number>((value?.days as number) || 7);
  const [model, setModel] = useState<string>((value?.model as string) || MODELS[0]);

  const emitChange = (updates: Partial<RollingAveragesArgs>) => {
    const newValue: RollingAveragesArgs = {
      days: updates.days ?? days,
      model: updates.model ?? model,
      removeOutliers: updates.removeOutliers ?? removeOutliers,
    };
    onChange?.(newValue as unknown as TransformerArgs);
  };

  // Emit initial value on mount
  useEffect(() => {
    emitChange({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="removeOutliers"
          checked={removeOutliers}
          onCheckedChange={(checked) => {
            const newValue = !!checked;
            setRemoveOutliers(newValue);
            emitChange({ removeOutliers: newValue });
          }}
          disabled={disabled}
        />
        <Label htmlFor="removeOutliers">{t("components:transformers.rollingAverages.removeOutliers")}</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="days">{t("components:transformers.rollingAverages.daysLabel")}</Label>
        <Input
          id="days"
          type="number"
          value={days}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10) || 1;
            setDays(newValue);
            emitChange({ days: newValue });
          }}
          disabled={disabled}
          min={1}
          max={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rolling-model">{t("components:transformers.rollingAverages.model")}</Label>
        <Select
          value={model}
          onValueChange={(value) => {
            setModel(value);
            emitChange({ model: value });
          }}
          disabled={disabled}
        >
          <SelectTrigger id="rolling-model">
            <SelectValue placeholder={t("components:transformers.rollingAverages.selectModel")} />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default RollingAverages;
