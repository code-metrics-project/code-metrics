import { useState, useEffect } from "react";
import { DatePicker } from "@/components/inputs/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { TransformerComponentProps, TransformerArgs } from "./transform";
import { useI18n } from "@/hooks/useI18n";

const MODELS = ["model1", "model2"];

function getRelativeDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

interface MLForecastArgs {
  forecastEndDate: Date;
  forecastModel: string;
  forecastStartDate: Date;
  trainingDataStartDate: Date;
}

export function MLForecast({ value, onChange, disabled = false }: TransformerComponentProps) {
  const { t } = useI18n();
  const [trainingDataStartDate, setTrainingDataStartDate] = useState<Date>(
    (value?.trainingDataStartDate as Date) || getRelativeDate(new Date(), -180)
  );
  const [forecastStartDate, setForecastStartDate] = useState<Date>((value?.forecastStartDate as Date) || new Date());
  const [forecastEndDate, setForecastEndDate] = useState<Date>(
    (value?.forecastEndDate as Date) || getRelativeDate(new Date(), 30)
  );
  const [forecastModel, setForecastModel] = useState<string>((value?.forecastModel as string) || MODELS[0]);

  const emitChange = (updates: Partial<MLForecastArgs>) => {
    const newValue: MLForecastArgs = {
      trainingDataStartDate: updates.trainingDataStartDate ?? trainingDataStartDate,
      forecastStartDate: updates.forecastStartDate ?? forecastStartDate,
      forecastEndDate: updates.forecastEndDate ?? forecastEndDate,
      forecastModel: updates.forecastModel ?? forecastModel,
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
      <DatePicker
        value={trainingDataStartDate}
        onChange={(date) => {
          if (date) {
            setTrainingDataStartDate(date);
            emitChange({ trainingDataStartDate: date });
          }
        }}
        disabled={disabled}
        label={t("components:transformers.mlForecast.trainingDataStartDate")}
      />

      <DatePicker
        value={forecastStartDate}
        onChange={(date) => {
          if (date) {
            setForecastStartDate(date);
            emitChange({ forecastStartDate: date });
          }
        }}
        disabled={disabled}
        label={t("components:transformers.mlForecast.forecastStartDate")}
      />

      <DatePicker
        value={forecastEndDate}
        onChange={(date) => {
          if (date) {
            setForecastEndDate(date);
            emitChange({ forecastEndDate: date });
          }
        }}
        disabled={disabled}
        label={t("components:transformers.mlForecast.forecastEndDate")}
      />

      <div className="space-y-2">
        <Label htmlFor="forecast-model">{t("components:transformers.mlForecast.forecastModel")}</Label>
        <Select
          value={forecastModel}
          onValueChange={(value) => {
            setForecastModel(value);
            emitChange({ forecastModel: value });
          }}
          disabled={disabled}
        >
          <SelectTrigger id="forecast-model">
            <SelectValue placeholder={t("components:transformers.mlForecast.selectModel")} />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default MLForecast;
