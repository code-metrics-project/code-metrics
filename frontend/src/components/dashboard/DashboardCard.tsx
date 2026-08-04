import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Bug, GitBranch, BarChart3, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { useCMQuery } from "@/queries/useCMQuery";
import type { DashboardDataSource, DashboardDataView } from "@/queries/useDashboards";
import { ChartRenderer } from "./renderers/ChartRenderer";
import { TrendRenderer } from "./renderers/TrendRenderer";
import { BarWithCumulativeLineRenderer } from "./renderers/BarWithCumulativeLineRenderer";
import { ColChartRenderer } from "./renderers/ColChartRenderer";
import { BoxPlotRenderer } from "./renderers/BoxPlotRenderer";

export interface DashboardCardProps {
  dataSource: DashboardDataSource;
  dataView: DashboardDataView;
  presentationOptions?: {
    title?: string;
    width?: number;
  };
}

// Map data source types to appropriate icons
const iconMap: Record<string, typeof Bug> = {
  openBugs: Bug,
  newBugs: Bug,
  codeCoverage: BarChart3,
  pipelineSuccess: Activity,
  repoChanges: GitBranch,
};

// Map data source names to query names
const dataSourceToQueryName: Record<string, string> = {
  changeFailureRate: "change-failure-rate",
  codeCoverage: "code-coverage",
  deploymentFrequency: "deployment-frequency",
  incidents: "production-incidents",
  issuesPerPR: "issues-per-pr",
  leadTimeForChanges: "lead-time-for-changes",
  newBugs: "bugs-new",
  openBugs: "bugs-open",
  pipelineRuns: "pipeline-runs",
  pipelineSuccess: "pipeline-success",
  prOpenTime: "pr-open-time",
  prsPerIssue: "prs-per-issue",
  repoChurn: "repo-churn",
  timeToRestoreService: "time-to-restore-service",
};

export function DashboardCard({ dataSource, dataView, presentationOptions }: DashboardCardProps) {
  const CardIcon = iconMap[dataSource.name] || TrendingUp;

  const queryName = dataSourceToQueryName[dataSource.name] || dataSource.name;

  const { data, isError, isFetching, isPending } = useCMQuery(
    {
      queryName,
      args: dataSource.args ?? {},
    },
    true
  );

  const renderer = useMemo(() => {
    if (!data) return null;

    switch (dataView.name) {
      case "Chart":
        return <ChartRenderer data={data} />;
      case "ColChart":
        return <ColChartRenderer data={data} />;
      case "BarWithCumulativeLine":
        return <BarWithCumulativeLineRenderer data={data} />;
      case "Trend":
        return <TrendRenderer data={data} />;
      case "BoxPlot":
        return <BoxPlotRenderer data={data} />;
      default:
        return <div className="text-muted-foreground">Unknown renderer: {dataView.name}</div>;
    }
  }, [data, dataView]);

  return (
    <Card className="group">
      <CardHeader className="border-border/50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex h-9 w-9 items-center justify-center rounded-lg transition-colors">
              <CardIcon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">{presentationOptions?.title}</CardTitle>
          </div>
          {!isPending && isFetching && <Loader2 className="text-primary h-5 w-5 animate-spin" />}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {isPending && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {isError && (
          <div className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p>Error fetching data.</p>
          </div>
        )}

        {renderer}
      </CardContent>
    </Card>
  );
}
