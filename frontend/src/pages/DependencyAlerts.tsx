import { useSearchParams } from "react-router-dom";
import { PageBreadcrumbs } from "@/components/layout";
import { DependencyAlertsList } from "@/components/dependencyAlerts";
import { Paths } from "@/router/paths";
import { useI18n } from "@/hooks/useI18n";
import { getWorkloadName } from "@/services/workload";

export default function DependencyAlerts() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const repoName = searchParams.get("repoName") ?? undefined;
  const repoGroupsParam = searchParams.get("repoGroups");
  const repoGroups = repoGroupsParam ? repoGroupsParam.split(",") : [];
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("nav:workload"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("nav:workloadDependencyAlerts") },
      ]
    : [{ label: t("nav:programme"), to: Paths.Program }, { label: t("nav:workloadDependencyAlerts") }];

  const workloadIds = workloadId ? [workloadId] : [];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:dependencyAlerts.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:dependencyAlerts.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <DependencyAlertsList
          workloadIds={workloadIds}
          repoName={repoName}
          repoGroups={repoGroups}
          executeOnMount={executeImmediately}
        />
      </div>
    </div>
  );
}
