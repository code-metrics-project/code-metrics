import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DynamicInputs, type QueryArgs } from "@/components/inputs";
import { DoughnutChart } from "@/components/charts";
import { executeQuery } from "@/services/query";
import type { RawQuery } from "@/model/query";
import type { DatedMetrics } from "@/model/metrics";
import { listRepoGroups, listWorkloadIds } from "@/config";
import { useI18n } from "@/hooks/useI18n";

interface WorkloadOutcome {
  key: string;
  total: number;
  chartData: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
    }[];
  };
}

function calculatePercentageByTag(data: Map<string, DatedMetrics>): Map<string, number> {
  const totals = new Map<string, number>();

  for (const [, datedMetrics] of data) {
    for (const [tag, entry] of datedMetrics.entries) {
      // Use the original tag as the key, not the extracted dimension
      totals.set(tag, (totals.get(tag) || 0) + entry.value);
    }
  }

  return totals;
}

function createDoughnutChartData(percentages: Map<string, number>) {
  const labels = Array.from(percentages.keys());
  const values = Array.from(percentages.values());

  // Map colors based on severity level in tag name
  const getColorForSeverity = (tag: string): string => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes("critical")) return "#dc2626"; // red
    if (lowerTag.includes("high")) return "#f97316"; // orange
    if (lowerTag.includes("medium")) return "#eab308"; // yellow/amber
    if (lowerTag.includes("low")) return "#3b82f6"; // blue (still indicates an issue)
    return "#6b7280"; // gray for unknown
  };

  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((label) => getColorForSeverity(label)),
      },
    ],
  };
}

function sumAllMetricValues(data: Map<string, DatedMetrics>): number {
  let total = 0;
  for (const [, datedMetrics] of data) {
    for (const entry of datedMetrics.entries.values()) {
      total += entry.value;
    }
  }
  return total;
}

export interface SecurityVulnerabilitiesProps {
  workload?: string;
  branchNames?: string[];
  executeOnMount?: boolean;
}

export function SecurityVulnerabilities({
  workload,
  branchNames,
  executeOnMount = false,
}: SecurityVulnerabilitiesProps) {
  const { t } = useI18n();
  const [workloadOutcomes, setWorkloadOutcomes] = useState<WorkloadOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(
    async (query: RawQuery, repoGroup: string, workloadId: string): Promise<WorkloadOutcome | null> => {
      try {
        const result = await executeQuery(query);

        if (result && result.size > 0) {
          const percentages = calculatePercentageByTag(result);
          const chartData = createDoughnutChartData(percentages);
          const total = sumAllMetricValues(result);

          return {
            key: `${workloadId}-${repoGroup}`,
            total,
            chartData,
          };
        }
        return null;
      } catch (e) {
        throw new Error(`Failed to fetch security vulnerabilities for ${workloadId}/${repoGroup}: ${e}`);
      }
    },
    []
  );

  const handleExecute = useCallback(
    async (rawQueries: RawQuery[]) => {
      setIsLoading(true);
      setError(null);
      setWorkloadOutcomes([]);

      try {
        const args = rawQueries[0]?.args || {};
        const workloads = (args.workloads as string[])?.length > 0 ? (args.workloads as string[]) : listWorkloadIds();

        let repoGroups: string[] = [];
        const inputRepoGroups = args.repoGroups as string[] | undefined;
        if (!inputRepoGroups || inputRepoGroups.length === 0) {
          repoGroups = listRepoGroups();
        } else {
          repoGroups = inputRepoGroups;
        }

        const queries: Promise<WorkloadOutcome | null>[] = [];
        for (const wl of workloads) {
          for (const rg of repoGroups) {
            const query: RawQuery = {
              queryName: "vulnerabilities",
              args: {
                ...args,
                repoGroups: [rg],
                workloads: [wl],
              },
            };
            queries.push(runQuery(query, rg, wl));
          }
        }

        const results = await Promise.all(queries);
        const outcomes = results.filter((r): r is WorkloadOutcome => r !== null);
        setWorkloadOutcomes(outcomes);
      } catch (e) {
        console.error("Failed to run queries", e);
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [runQuery]
  );

  const defaultInputs: QueryArgs = {
    workloads: workload ? [workload] : [],
    branchNames: branchNames || [],
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:securityVulnerabilities.title")}</CardTitle>
        <CardDescription>{t("components:securityVulnerabilities.description")}</CardDescription>
      </CardHeader>

      {error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("components:securityVulnerabilities.error")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <DynamicInputs
              queryTypes={["vulnerabilities"]}
              queryName="Security vulnerabilities"
              defaultInputs={defaultInputs}
              isBusy={isLoading}
              executeOnMount={executeOnMount}
              onExecute={handleExecute}
            />
          </div>
        </div>

        {/* Loading skeleton for results */}
        {isLoading && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 text-center">
                <Skeleton className="mx-auto h-5 w-2/3" />
                <Skeleton className="mx-auto h-8 w-1/2" />
                <Skeleton className="mx-auto h-32 w-32 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && workloadOutcomes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {workloadOutcomes.map((outcome) => (
              <div key={outcome.key} className="flex flex-col items-center space-y-3">
                <h3 className="max-w-full truncate px-2 text-base font-semibold" title={outcome.key}>
                  {outcome.key}
                </h3>
                <p className="text-3xl font-bold">
                  {t("components:securityVulnerabilities.total", { count: Math.round(outcome.total) })}
                </p>
                <div className="w-full">
                  <DoughnutChart
                    chartData={{
                      labels: outcome.chartData.labels,
                      data: outcome.chartData.datasets[0].data,
                      colors: outcome.chartData.datasets[0].backgroundColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && workloadOutcomes.length === 0 && !error && (
          <div className="text-muted-foreground mt-4 py-8 text-center">
            {t("components:securityVulnerabilities.noResults")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
