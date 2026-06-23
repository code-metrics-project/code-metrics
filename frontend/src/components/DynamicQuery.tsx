import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicInputs, type QueryArgs } from "@/components/inputs";
import { MultiChart, type MultiChartData } from "@/components/charts";
import { ChartSelector, ChartType, QueryGroup, type GroupByDimension } from "@/components/query";
import { Transformers, type TransformState } from "@/components/transformers";
import { executeQuery } from "@/services/query";
import type { DatedMetrics } from "@/model/metrics";
import type { RawQuery } from "@/model/query";
import { getGroupByDimensions } from "@/queries/groupBy";

export interface DynamicQueryInputs {
  workloads?: string[];
  repoGroups?: string[];
  startDate?: string;
}

export interface DynamicQueryProps {
  title: string;
  subtitle?: string;
  queryTypes: string[];
  executeOnMount?: boolean;
  defaultInputs?: QueryArgs;
  chartType?: ChartType;
  hideChartSelector?: boolean;
  summarise?: string[];
  onInputChange?: (inputs: DynamicQueryInputs) => void;
  children?: React.ReactNode;
}

// Transform query results to MultiChart format
function transformToMultiChart(data: Map<string, DatedMetrics>): MultiChartData {
  console.log("[DynamicQuery] Transforming data with", data.size, "dates");

  // Pivot the data: input is Map<date, {entries: Map<group, value>}>
  // We need to create one dataset per group with all dates
  const groupedByName = new Map<string, { x: number; y: number }[]>();

  // Iterate over each date
  for (const [dateStr, datedMetrics] of data.entries()) {
    const timestamp = new Date(dateStr).getTime();

    // Iterate over each group in this date
    for (const [groupKey, metricEntry] of datedMetrics.entries) {
      if (!groupedByName.has(groupKey)) {
        groupedByName.set(groupKey, []);
      }

      groupedByName.get(groupKey)!.push({
        x: timestamp,
        y: typeof metricEntry.value === "number" ? metricEntry.value : 0,
      });
    }
  }

  // Convert to datasets array
  const datasets = Array.from(groupedByName.entries()).map(([groupKey, dataPoints]) => {
    console.log(`[DynamicQuery] Dataset '${groupKey}':`, dataPoints.length, "points");
    return {
      name: groupKey,
      data: dataPoints.sort((a, b) => a.x - b.x), // Sort by date
    };
  });

  console.log("[DynamicQuery] Created", datasets.length, "datasets for chart");
  return { datasets };
}

export function DynamicQuery({
  title,
  subtitle,
  queryTypes,
  executeOnMount = false,
  defaultInputs,
  chartType: initialChartType = ChartType.MultiChart,
  hideChartSelector = false,
  onInputChange,
  children,
}: DynamicQueryProps) {
  const [chartType, setChartType] = useState(initialChartType);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Map<string, DatedMetrics>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transforms, setTransforms] = useState<TransformState>({});

  // Group by support
  const supportedDimensions = getGroupByDimensions(queryTypes);
  const [groupBy, setGroupBy] = useState<GroupByDimension | undefined>(
    supportedDimensions.length > 0 ? supportedDimensions[0] : undefined
  );

  const handleExecute = useCallback(
    async (queries: RawQuery[]) => {
      if (queries.length === 0) return;

      setIsLoading(true);
      setError(null);
      setResults(null);

      try {
        const allResults: Map<string, DatedMetrics>[] = [];
        for (const query of queries) {
          // Add groupBy to query if supported and selected
          const queryWithGroupBy = groupBy ? { ...query, groupBy } : query;

          // First, always execute the original query without transforms
          const originalResult = await executeQuery(queryWithGroupBy);
          if (originalResult && originalResult.size > 0) {
            allResults.push(originalResult);
          }

          // Then, if transforms are configured, execute with transforms and add as separate series
          const queryTransforms = transforms[query.queryName];
          if (queryTransforms && queryTransforms.length > 0) {
            // Filter out transforms with null transform and map to RawQuery format
            const validTransforms = queryTransforms
              .filter((t): t is typeof t & { transform: NonNullable<typeof t.transform> } => t.transform !== null)
              .map((t) => ({
                transform: t.transform as unknown as import("@/model/query").TransformTypes,
                args: t.args,
              }));
            if (validTransforms.length === 0) continue;
            const transformedQuery = { ...queryWithGroupBy, transforms: validTransforms };
            const transformedResult = await executeQuery(transformedQuery);
            if (transformedResult && transformedResult.size > 0) {
              allResults.push(transformedResult);
            }
          }
        }
        setResults(allResults);
      } catch (e) {
        console.error("Query execution failed:", e);
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [groupBy, transforms]
  );

  const renderChart = () => {
    if (!results || results.length === 0) return null;

    // Combine all results into chart data, merging metrics from multiple queries
    const combinedData = new Map<string, DatedMetrics>();
    for (const result of results) {
      for (const [key, datedMetrics] of result) {
        const existing = combinedData.get(key);
        if (existing) {
          // Merge entries from multiple results for the same date
          combinedData.set(key, {
            ...datedMetrics,
            entries: new Map([...existing.entries, ...datedMetrics.entries]),
          });
        } else {
          combinedData.set(key, datedMetrics);
        }
      }
    }

    // For now, always use MultiChart as it's the most versatile
    return <MultiChart chartData={transformToMultiChart(combinedData)} height={400} />;
  };

  // Suppress unused variable warning
  void chartType;

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>

      <CardContent className="pt-4">
        <DynamicInputs
          queryTypes={queryTypes}
          queryName={title}
          isBusy={isLoading}
          onExecute={handleExecute}
          onInput={onInputChange}
          defaultInputs={defaultInputs}
          executeOnMount={executeOnMount}
        >
          {/* Group by selector - rendered after filters */}
          {supportedDimensions.length > 0 && (
            <QueryGroup dimensions={supportedDimensions} value={groupBy} onChange={setGroupBy} disabled={isLoading} />
          )}

          {/* Transformers - rendered after GroupBy */}
          {queryTypes.length > 0 && (
            <Transformers queryTypes={queryTypes} onChange={setTransforms} disabled={isLoading} />
          )}
        </DynamicInputs>

        {/* Chart type selector */}
        {!hideChartSelector && children && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4">
            <ChartSelector value={chartType} onChange={setChartType} disabled={isLoading} />
            {children}
          </div>
        )}
        {hideChartSelector && children && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4">{children}</div>
        )}
      </CardContent>

      {/* Loading state */}
      {isLoading && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-75 w-full rounded-lg" />
        </CardContent>
      )}

      {/* Error state */}
      {error && (
        <CardContent>
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">{error}</div>
        </CardContent>
      )}

      {/* Chart */}
      {!isLoading && !error && results && results.length > 0 && <CardContent>{renderChart()}</CardContent>}
    </Card>
  );
}

export default DynamicQuery;
