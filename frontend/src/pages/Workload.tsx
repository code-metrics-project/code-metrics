import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { getWorkloadDetail, getWorkloadPipelineFilters } from "@/services/workload";
import { Paths } from "@/router/paths";
import { Button } from "@/components/ui/button";
import { BehindFlag } from "@/components/BehindFlag";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dashboard } from "@/components/dashboard";
import { getRelativeDate } from "@/utils/date";
import { useI18n } from "@/hooks/useI18n";
import type { Dashboard as TDashboard } from "@/queries/useDashboards";

const DAYS_BACK = 60;
const SHORT_DAYS_BACK = 15;

export default function Workload() {
  const { t } = useI18n();
  const { workloadId } = useParams<{ workloadId: string }>();

  const pipelineFilters = useMemo(() => {
    if (!workloadId) {
      return { jobGroups: [], jobNames: [] };
    }
    return getWorkloadPipelineFilters(workloadId);
  }, [workloadId]);

  const workload = useMemo(() => {
    if (!workloadId) return null;
    try {
      return getWorkloadDetail(workloadId);
    } catch {
      return null;
    }
  }, [workloadId]);

  const dashboard = useMemo<TDashboard | null>(() => {
    if (!workloadId || !workload) return null;

    return {
      id: `${workloadId}-summary`,
      name: workload.name,
      data: [
        {
          id: "bugs-trend",
          presentationOptions: {
            title: t("pages:openBugsTrendTitle", { days: DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "openBugs",
            args: {
              issueFilter: { priority: "Low" },
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "Trend",
            props: {},
          },
        },
        {
          id: "coverage-trend",
          presentationOptions: {
            title: t("pages:coverageTrendTitle", { days: DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "codeCoverage",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "Trend",
            props: {},
          },
        },
        {
          id: "pipeline-trend",
          presentationOptions: {
            title: t("pages:pipelineSuccessTitle", { days: SHORT_DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "pipelineRuns",
            args: {
              startDate: getRelativeDate(new Date(), -SHORT_DAYS_BACK),
              workloads: [workloadId],
              branchNames: ["main"],
              ...(pipelineFilters.jobGroups.length > 0 ? { jobGroups: pipelineFilters.jobGroups } : {}),
              ...(pipelineFilters.jobNames.length > 0 ? { jobNames: pipelineFilters.jobNames } : {}),
            },
          },
          dataView: {
            name: "Trend",
            props: {},
          },
        },
        {
          id: "bugs-chart",
          presentationOptions: {
            title: t("pages:newBugsChartTitle", { days: DAYS_BACK }),
            width: 6,
          },
          dataSource: {
            name: "newBugs",
            args: {
              issueFilter: { priority: "Low" },
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "BarWithCumulativeLine",
            props: {},
          },
        },
        {
          id: "coverage-chart",
          presentationOptions: {
            title: t("pages:coverageChartTitle", { days: DAYS_BACK }),
            width: 6,
          },
          dataSource: {
            name: "codeCoverage",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "Chart",
            props: {},
          },
        },
      ],
    };
  }, [workloadId, workload, t, pipelineFilters]);

  if (!workload) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">{t("pages:workload.notFound")}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={Paths.Workloads}>{t("nav:workload")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{workload.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="mt-2 text-3xl font-bold">{workload.name}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:workload.title")}</p>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={`${Paths.WorkloadChanges}?workloadId=${workloadId}&executeImmediately=true`}>
                {t("pages:workload.recentChanges")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={Paths.WorkloadQualityGates.replace(":workloadId", workloadId!)}>
                {t("pages:workload.qualityGates")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={`${Paths.WorkloadCodeQuality}?workloadId=${workloadId}&executeImmediately=true`}>
                {t("pages:workload.codeQuality")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link
                to={`${Paths.WorkloadPipelineRuns}?workloadId=${workloadId}&executeImmediately=true&branchName=main`}
              >
                {t("pages:workload.cicdPipeline")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link
                to={`${Paths.WorkloadPipelineHealth}?workloadId=${workloadId}&executeImmediately=true&branchName=main`}
              >
                {t("pages:workload.pipelineHealth")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={`${Paths.ProgramTickets}?workloadId=${workloadId}&executeImmediately=true`}>
                {t("pages:workload.bugsAndIncidents")}
              </Link>
            </Button>
            <BehindFlag feature="dora">
              <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
                <Link to={`${Paths.DORA}?workloadId=${workloadId}`}>{t("pages:workload.doraMetrics")}</Link>
              </Button>
            </BehindFlag>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={`${Paths.WorkloadAnalysis}?workloadId=${workloadId}&executeImmediately=false`}>
                {t("pages:workload.analyse")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={`${Paths.WorkloadDependencyAlerts}?workloadId=${workloadId}`}>
                {t("pages:workload.dependencyAlerts")}
              </Link>
            </Button>
            <Button variant="secondary" asChild className="bg-card hover:bg-accent border-border/50 border shadow-sm">
              <Link to={Paths.WorkloadRepositories.replace(":workloadId", workloadId!)}>
                {t("pages:workload.repositories")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">{dashboard && <Dashboard dashboard={dashboard} />}</div>
    </div>
  );
}
