import { useState, useCallback } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageBreadcrumbs } from "@/components/layout";
import { ChevronDown, Save } from "lucide-react";
import {
  QueryPicker,
  ChartSelector,
  ChartType,
  QueryGroup,
  type GroupByDimension,
  SaveQueryDialog,
} from "@/components/query";
import { DynamicInputs, type QueryArgs } from "@/components/inputs";
import { Transformers, type TransformState } from "@/components/transformers";
import { MultiChart, ColumnChart, DoughnutChart, DataTable } from "@/components/charts";
import { executeQuery } from "@/services/query";
import { Paths } from "@/router/paths";
import { getGroupByDimensions } from "@/queries/groupBy";
import { toStoredQueryCollection } from "@/queries/summary";
import type { DatedMetrics } from "@/model/metrics";
import type { RawQuery, StoredQueryCollection } from "@/model/query";

export default function NewQuery() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>(ChartType.MultiChart);
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Map<string, DatedMetrics>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group by support
  const supportedDimensions = getGroupByDimensions(selectedQueries);
  const [groupBy, setGroupBy] = useState<GroupByDimension | undefined>(undefined);

  // Transformers support
  const [transforms, setTransforms] = useState<TransformState>({});

  // Save query state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [collection, setCollection] = useState<Partial<StoredQueryCollection>>({});

  // Update collection whenever inputs change
  const handleInputChange = useCallback(
    (values: QueryArgs) => {
      const updatedCollection = toStoredQueryCollection(selectedQueries, values);
      // Preserve chart type in render settings
      if (updatedCollection.queries?.[0]) {
        updatedCollection.queries[0].render = { chartType };
      }
      setCollection(updatedCollection);
    },
    [selectedQueries, chartType]
  );

  const handleExecute = useCallback(async (queries: RawQuery[]) => {
    if (queries.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const allResults: Map<string, DatedMetrics>[] = [];
      for (const query of queries) {
        // First, execute the original query without transforms
        const baseQuery = { ...query };
        delete baseQuery.transforms;
        const result = await executeQuery(baseQuery);
        if (result && result.size > 0) {
          allResults.push(result);
        }

        // Then, if transforms are configured, execute with transforms and add as separate series
        if (query.transforms && query.transforms.length > 0) {
          const transformedResult = await executeQuery(query);
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
  }, []);

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

    switch (chartType) {
      case ChartType.MultiChart:
        return (
          <MultiChart chartData={transformForMultiChart(combinedData)} height={400} showDataLabels={showDataLabels} />
        );
      case ChartType.ColumnChart:
        return (
          <ColumnChart chartData={transformForColumnChart(combinedData)} height={400} showDataLabels={showDataLabels} />
        );
      case ChartType.DataTable:
        return <DataTable chartData={transformForDataTable(combinedData)} showExport />;
      case ChartType.DoughnutChart:
        return <DoughnutChart chartData={transformForDoughnut(combinedData)} showDataLabels={showDataLabels} />;
      default:
        return (
          <MultiChart chartData={transformForMultiChart(combinedData)} height={400} showDataLabels={showDataLabels} />
        );
    }
  };

  const breadcrumbs = [{ label: t("nav:explore"), to: Paths.Explore }, { label: t("pages:newQuery.breadcrumb") }];

  return (
    <div>
      {/* Header section */}
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-4 text-3xl font-bold">{t("pages:newQuery.title")}</h2>
        </div>
      </div>

      {/* Query builder */}
      <div className="container mx-auto px-4 py-4">
        <Card className="card-elevated pt-0">
          {/* Header with query picker */}
          <div className="bg-secondary/50 space-y-4 rounded-t-lg p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="lg:w-1/3">
                <h3 className="text-lg font-semibold">{t("pages:newQuery.buildQuery")}</h3>
                <p className="text-muted-foreground text-sm">{t("pages:newQuery.description")}</p>
              </div>
              <div className="lg:flex-1">
                <QueryPicker
                  value={selectedQueries}
                  onChange={(v) => setSelectedQueries((v as string[]) ?? [])}
                  multiple
                  disabled={isLoading}
                  label={t("pages:newQuery.dataSources")}
                />
              </div>
            </div>
          </div>

          <CardContent className="pt-4">
            <DynamicInputs
              queryTypes={selectedQueries}
              queryName="New Query"
              isBusy={isLoading}
              onExecute={handleExecute}
              onInput={handleInputChange}
              groupBy={groupBy}
              transforms={transforms}
            >
              {/* GroupBy selector - shown when supported dimensions exist */}
              {supportedDimensions.length > 0 && (
                <QueryGroup
                  dimensions={supportedDimensions}
                  value={groupBy}
                  onChange={setGroupBy}
                  disabled={isLoading}
                />
              )}

              {/* Transformers - shown when queries are selected */}
              {selectedQueries.length > 0 && (
                <Transformers queryTypes={selectedQueries} onChange={setTransforms} disabled={isLoading} />
              )}
            </DynamicInputs>

            {/* Chart type selector - always visible */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4">
              <ChartSelector value={chartType} onChange={setChartType} disabled={isLoading} />

              {/* Menu options */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button name="queryMenu" variant="outline" size="sm">
                    <ChevronDown className="mr-2 h-4 w-4" />
                    {t("pages:newQuery.options")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={selectedQueries.length === 0}
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {t("pages:newQuery.button")}
                    </Button>
                    <Separator />
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Checkbox
                        id="dataLabels"
                        checked={showDataLabels}
                        onCheckedChange={(checked) => setShowDataLabels(checked === true)}
                      />
                      <Label htmlFor="dataLabels" className="cursor-pointer text-sm">
                        {t("pages:savedQuery.showDataLabels")}
                      </Label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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
              <div className="bg-destructive/10 border-destructive/30 text-destructive rounded-lg border p-4">
                {error}
              </div>
            </CardContent>
          )}

          {/* Results */}
          {!isLoading && results && results.length > 0 && <CardContent>{renderChart()}</CardContent>}

          {/* Empty state */}
          {!isLoading && results?.length === 0 && (
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">{t("pages:newQuery.noData")}</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Save Query Dialog */}
      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        collection={collection}
        onSaved={(savedCollection) => {
          // Store the chart type in the saved collection
          if (savedCollection.queries?.[0]) {
            savedCollection.queries[0].render = { chartType };
          }
          // Navigate to the saved query page
          navigate(`${Paths.SavedQueries}/${savedCollection.id}`);
        }}
      />
    </div>
  );
}

// Helper to transform DatedMetrics for MultiChart (line charts)
function transformForMultiChart(data: Map<string, DatedMetrics>) {
  const datasets: { name: string; data: { x: number; y: number }[] }[] = [];
  const metricsByName = new Map<string, { x: number; y: number }[]>();

  data.forEach((datedMetrics, dateStr) => {
    const date = new Date(dateStr).getTime();
    datedMetrics.entries.forEach((entry, metricName) => {
      if (!metricsByName.has(metricName)) {
        metricsByName.set(metricName, []);
      }
      metricsByName.get(metricName)!.push({ x: date, y: entry.value });
    });
  });

  metricsByName.forEach((dataPoints, name) => {
    datasets.push({
      name,
      data: dataPoints.sort((a, b) => a.x - b.x),
    });
  });

  return { datasets };
}

// Helper to transform DatedMetrics for ColumnChart (bar charts)
function transformForColumnChart(data: Map<string, DatedMetrics>) {
  const series: { name: string; data: { x: number; y: number }[] }[] = [];
  const metricsByName = new Map<string, { x: number; y: number }[]>();

  data.forEach((datedMetrics, dateStr) => {
    const date = new Date(dateStr).getTime();
    datedMetrics.entries.forEach((entry, metricName) => {
      if (!metricsByName.has(metricName)) {
        metricsByName.set(metricName, []);
      }
      metricsByName.get(metricName)!.push({ x: date, y: entry.value });
    });
  });

  metricsByName.forEach((dataPoints, name) => {
    series.push({
      name,
      data: dataPoints.sort((a, b) => a.x - b.x),
    });
  });

  return { series };
}

// Helper to transform DatedMetrics for DataTable
function transformForDataTable(data: Map<string, DatedMetrics>) {
  const rows: Record<string, unknown>[] = [];
  const metricNames = new Set<string>();

  // Collect all metric names
  data.forEach((datedMetrics) => {
    datedMetrics.entries.forEach((_, metricName) => {
      metricNames.add(metricName);
    });
  });

  // Build rows by date
  data.forEach((datedMetrics, dateStr) => {
    const row: Record<string, unknown> = { date: dateStr };
    datedMetrics.entries.forEach((entry, metricName) => {
      row[metricName] = entry.value;
    });
    rows.push(row);
  });

  // Sort rows by date
  rows.sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());

  // Build columns
  const columns = [
    { key: "date", label: "Date" },
    ...Array.from(metricNames).map((name) => ({ key: name, label: name })),
  ];

  return { columns, rows };
}

// Helper to transform DatedMetrics for doughnut chart
function transformForDoughnut(data: Map<string, DatedMetrics>) {
  const totals = new Map<string, number>();

  data.forEach((datedMetrics) => {
    datedMetrics.entries.forEach((entry, metricName) => {
      totals.set(metricName, (totals.get(metricName) ?? 0) + entry.value);
    });
  });

  const labels = Array.from(totals.keys());
  const values = Array.from(totals.values());
  // Severity colors: critical, high, medium, low, info, other - visible on both themes
  const colors = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  return {
    labels,
    data: values,
    colors: labels.map((_, i) => colors[i % colors.length]),
  };
}
