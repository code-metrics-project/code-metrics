import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { getRepositoryDetail, getWorkloadDetail } from "@/services/workload";
import { Paths } from "@/router/paths";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
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

export default function Repository() {
  const { t } = useI18n();
  const {
    workloadId,
    repoGroup,
    repoName: encodedRepoName,
  } = useParams<{
    workloadId: string;
    repoGroup: string;
    repoName: string;
  }>();

  const repoName = encodedRepoName ? decodeURIComponent(encodedRepoName) : undefined;

  const workload = useMemo(() => {
    if (!workloadId) return null;
    try {
      return getWorkloadDetail(workloadId);
    } catch {
      return null;
    }
  }, [workloadId]);

  const repo = useMemo(() => {
    if (!workloadId || !repoName) return null;
    return getRepositoryDetail(workloadId, repoName) ?? null;
  }, [workloadId, repoName]);

  const dashboard = useMemo<TDashboard | null>(() => {
    if (!workloadId || !repoGroup || !repoName || !repo) return null;

    return {
      id: `${workloadId}-${repoGroup}-${repoName}`,
      name: repoName,
      data: [
        {
          id: "coverage-trend",
          presentationOptions: {
            title: t("pages:repository.coverageTrendTitle", { days: DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "codeCoverage",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
              repoGroups: [repoGroup],
            },
          },
          dataView: { name: "Trend", props: {} },
        },
        {
          id: "pipeline-success",
          presentationOptions: {
            title: t("pages:repository.pipelineSuccessTitle", { days: SHORT_DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "pipelineSuccess",
            args: {
              startDate: getRelativeDate(new Date(), -SHORT_DAYS_BACK),
              workloads: [workloadId],
              branchNames: ["main"],
            },
          },
          dataView: { name: "Trend", props: {} },
        },
        {
          id: "complexity-chart",
          presentationOptions: {
            title: t("pages:repository.complexityChartTitle", { days: DAYS_BACK }),
            width: 4,
          },
          dataSource: {
            name: "cyclomatic-complexity",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
              repoGroups: [repoGroup],
            },
          },
          dataView: { name: "Chart", props: {} },
        },
        {
          id: "churn-chart",
          presentationOptions: {
            title: t("pages:repository.churnChartTitle", { days: DAYS_BACK }),
            width: 6,
          },
          dataSource: {
            name: "repoChurn",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
              repoGroups: [repoGroup],
            },
          },
          dataView: { name: "BarWithCumulativeLine", props: {} },
        },
        {
          id: "loc-chart",
          presentationOptions: {
            title: t("pages:repository.locChartTitle", { days: DAYS_BACK }),
            width: 6,
          },
          dataSource: {
            name: "lines-of-code",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
              repoGroups: [repoGroup],
            },
          },
          dataView: { name: "Chart", props: {} },
        },
        {
          id: "vulnerabilities-chart",
          presentationOptions: {
            title: t("pages:repository.vulnerabilitiesChartTitle", { days: DAYS_BACK }),
            width: 12,
          },
          dataSource: {
            name: "vulnerabilities",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
              repoGroups: [repoGroup],
            },
          },
          dataView: { name: "Chart", props: {} },
        },
      ],
    };
  }, [workloadId, repoGroup, repoName, repo, t]);

  if (!workloadId || !repoGroup || !repoName || !repo) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">{t("pages:repository.notFound")}</p>
      </div>
    );
  }

  const repositoriesPath = Paths.WorkloadRepositories.replace(":workloadId", workloadId);

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
                <BreadcrumbLink asChild>
                  <Link to={`${Paths.Workloads}/${workloadId}`}>{workload?.name ?? workloadId}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={repositoriesPath}>{t("pages:workload.repositories")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{repoName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="mt-2 text-3xl font-bold">{repoName}</h2>

          {/* Metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium">{t("pages:repository.workloadLabel")}:</span>
              <Link to={`${Paths.Workloads}/${workloadId}`} className="text-primary hover:underline">
                {workload?.name ?? workloadId}
              </Link>
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium">{t("pages:repository.repoGroupsLabel")}:</span>
              <span className="flex flex-wrap gap-1">
                {repo.repoGroups.map((g) => (
                  <Badge key={g} variant={g === repoGroup ? "default" : "secondary"} className="text-xs">
                    {g}
                  </Badge>
                ))}
              </span>
            </span>
            {repo.url && (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                {t("pages:repository.openRepo")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">{dashboard && <Dashboard dashboard={dashboard} />}</div>
    </div>
  );
}
