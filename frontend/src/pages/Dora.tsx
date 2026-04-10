import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";
import { Dashboard } from "@/components/dashboard";
import { Paths } from "@/router/paths";
import { listWorkloads } from "@/config";
import { getRelativeDate } from "@/utils/date";
import { ACCENT_COLORS } from "@/utils/chartColors";
import type { Dashboard as TDashboard } from "@/queries/useDashboards";

const DAYS_BACK = 15;
const SHORT_DAYS_BACK = 7;

export default function Dora() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? "";

  const workload = useMemo(() => {
    const workloads = listWorkloads();
    return workloads.find((w) => w.id === workloadId) ?? { id: workloadId, name: workloadId };
  }, [workloadId]);

  const dashboard = useMemo((): TDashboard => {
    return {
      id: `${workloadId}-dora`,
      name: workload.name,
      data: [
        {
          id: "deployment-frequency",
          presentationOptions: {
            title: `Deployment frequency last ${DAYS_BACK} days`,
            width: 6,
          },
          dataSource: {
            name: "deploymentFrequency",
            args: {
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "ColChart",
            props: {},
          },
        },
        {
          id: "change-failure-rate",
          presentationOptions: {
            title: `Change failure rate last ${DAYS_BACK} days`,
            width: 6,
          },
          dataSource: {
            name: "changeFailureRate",
            args: {
              incidentFilter: { priority: "Low" },
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "ColChart",
            props: {
              colors: [ACCENT_COLORS.gold],
              yaxis: { max: 1 },
            },
          },
        },
        {
          id: "lead-time-for-changes",
          presentationOptions: {
            title: `Lead time for changes last ${SHORT_DAYS_BACK} days`,
            width: 6,
          },
          dataSource: {
            name: "leadTimeForChanges",
            args: {
              startDate: getRelativeDate(new Date(), -SHORT_DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "Chart",
            props: {},
          },
        },
        {
          id: "time-to-restore-service",
          presentationOptions: {
            title: `Time to restore service last ${DAYS_BACK} days`,
            width: 6,
          },
          dataSource: {
            name: "timeToRestoreService",
            args: {
              incidentFilter: { priority: "Low" },
              startDate: getRelativeDate(new Date(), -DAYS_BACK),
              workloads: [workloadId],
            },
          },
          dataView: {
            name: "ColChart",
            props: {},
          },
        },
      ],
    };
  }, [workloadId, workload]);

  const breadcrumbs = [
    { label: t("pages:workloads.title"), to: Paths.Workloads },
    ...(workloadId ? [{ label: workload.name, to: `${Paths.Workloads}/${workloadId}` }] : []),
    { label: t("pages:dora.title") },
  ];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{workload.name}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:dora.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Dashboard dashboard={dashboard} key={dashboard.id} />
      </div>
    </div>
  );
}
