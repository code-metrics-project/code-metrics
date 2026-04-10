import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DynamicInputs } from "@/components/inputs";
import { QueryPicker } from "@/components/query";
import { MultiChart, type MultiChartData } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { predict } from "@/services/prediction";
import { convertMetricsObjToMap, getMetricsMetadata } from "@/utils/metrics";
import type { RawQuery } from "@/model/query";
import type { DatedMetrics } from "@/model/metrics";
import { useI18n } from "@/hooks/useI18n";

// Default query selections matching Vue app
const DEFAULT_INPUT_QUERIES = ["code-coverage"];
const DEFAULT_LABEL_QUERY = "bugs-open";

/**
 * Transforms prediction results to MultiChartData format
 */
function createMultiChartDatasets(
  inputs: Map<string, DatedMetrics>[],
  overrides: Record<string, { min: number; max: number }> = {}
): MultiChartData {
  const datasets: { name: string; data: { x: number; y: number }[] }[] = [];

  inputs.forEach((input) => {
    // Group entries by name across all dates
    const groupedByName = new Map<string, { x: number; y: number }[]>();

    input.forEach((datedMetrics, dateStr) => {
      const timestamp = new Date(dateStr).getTime();
      datedMetrics.entries.forEach((entry, name) => {
        if (!groupedByName.has(name)) {
          groupedByName.set(name, []);
        }
        groupedByName.get(name)!.push({
          x: timestamp,
          y: entry.value,
        });
      });
    });

    // Create dataset for each group
    groupedByName.forEach((data, name) => {
      datasets.push({
        name,
        data: data.sort((a, b) => a.x - b.x),
      });
    });
  });

  void overrides; // May be used for axis scaling in future
  return { datasets };
}

export function Predictions() {
  const { t } = useI18n();
  const [inputQueriesModel, setInputQueriesModel] = useState<string[]>(DEFAULT_INPUT_QUERIES);
  const [labelQueryModel, setLabelQueryModel] = useState<string>(DEFAULT_LABEL_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<MultiChartData | null>(null);

  // Compute query types needed for DynamicInputs
  const queryTypes = useMemo(() => {
    const allQueries = [...inputQueriesModel];
    if (labelQueryModel) {
      allQueries.push(labelQueryModel);
    }
    return Array.from(new Set(allQueries));
  }, [inputQueriesModel, labelQueryModel]);

  const handleExecute = useCallback(
    async (queries: RawQuery[]) => {
      if (queries.length === 0) return;

      setIsLoading(true);
      setError(null);
      setChartData(null);

      try {
        // Filter queries into input queries and label query
        const inputQueries = queries.filter((q) => inputQueriesModel.includes(q.queryName));
        const labelQuery = queries.find((q) => q.queryName === labelQueryModel);

        if (!labelQuery) {
          throw new Error("Label query not found");
        }

        // Call the prediction API
        const responseData = await predict(inputQueries, labelQuery);

        // Convert response data to chart format
        const allDatasets: Map<string, DatedMetrics>[] = Object.values(responseData).map((metrics) => {
          return convertMetricsObjToMap(metrics);
        });

        // Get label result for scaling
        const labelResult = convertMetricsObjToMap(responseData[labelQueryModel]);
        const maxLabelResult = getMetricsMetadata(labelResult, (entry) => entry.value).max ?? 0;
        const overrides = { prediction: { min: 0, max: maxLabelResult } };

        // Create chart data
        const newChartData = createMultiChartDatasets(allDatasets, overrides);
        setChartData(newChartData);
      } catch (e) {
        console.error("Failed to run prediction queries", e);
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [inputQueriesModel, labelQueryModel]
  );

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{t("components:predictions.title")}</CardTitle>
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            {t("common:badge.experimental")}
          </Badge>
        </div>
        <CardDescription>{t("components:predictions.description")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Query Selection Section */}
        <div className="bg-muted/50 mb-4 space-y-4 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">{t("components:predictions.chooseQueries")}</p>

          <div className="space-y-2">
            <QueryPicker
              value={inputQueriesModel}
              onChange={(v) => setInputQueriesModel(v as string[])}
              multiple
              disabled={isLoading}
              label={t("components:predictions.inputQueries")}
            />
          </div>

          <div className="space-y-2">
            <QueryPicker
              value={labelQueryModel}
              onChange={(v) => setLabelQueryModel(v as string)}
              disabled={isLoading}
              label={t("components:predictions.labelQuery")}
            />
          </div>
        </div>

        {/* Dynamic Inputs */}
        <DynamicInputs queryTypes={queryTypes} queryName="Prediction" isBusy={isLoading} onExecute={handleExecute} />
      </CardContent>

      {/* Loading state */}
      {isLoading && (
        <CardContent className="space-y-4">
          <Skeleton className="h-100 w-full" />
        </CardContent>
      )}

      {/* Error state */}
      {error && (
        <CardContent>
          <div className="text-destructive text-sm">{error}</div>
        </CardContent>
      )}

      {/* Chart */}
      {chartData && chartData.datasets.length > 0 && (
        <CardContent>
          <MultiChart chartData={chartData} height={400} />
        </CardContent>
      )}
    </Card>
  );
}
