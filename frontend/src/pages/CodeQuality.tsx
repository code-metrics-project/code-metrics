import { useSearchParams } from "react-router-dom";
import { PageBreadcrumbs } from "@/components/layout";
import { CodeAnalysisAggregate } from "@/components/CodeAnalysisAggregate";
import { Paths } from "@/router/paths";
import { useI18n } from "@/hooks/useI18n";
import { getWorkloadName } from "@/services/workload";

export default function CodeQuality() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;

  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:codeQuality.breadcrumb") },
      ]
    : [{ label: t("pages:workloads.title"), to: Paths.Workloads }, { label: t("pages:codeQuality.breadcrumb") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:codeQuality.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:codeQuality.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <CodeAnalysisAggregate
          workloads={workloadId ? [workloadId] : []}
          aggregateRepos={false}
          executeOnMount={executeImmediately}
        />
      </div>
    </div>
  );
}
