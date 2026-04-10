import { useSearchParams } from "react-router-dom";
import { PageBreadcrumbs } from "@/components/layout";
import { Paths } from "@/router/paths";
import { RepoChanges } from "@/components/RepoChanges";
import { useI18n } from "@/hooks/useI18n";
import { getWorkloadName } from "@/services/workload";

export default function Narratives() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId");
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("nav:workload"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("nav:changes") },
      ]
    : [{ label: t("nav:programme"), to: Paths.Program }, { label: t("nav:changes") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:narratives.title")}</h2>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {workloadId ? (
          <RepoChanges workload={workloadId} executeOnMount={executeImmediately} />
        ) : (
          <RepoChanges executeOnMount={executeImmediately} />
        )}
      </div>
    </div>
  );
}
