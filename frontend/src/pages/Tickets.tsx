import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";
import { DynamicQuery } from "@/components/DynamicQuery";
import { Paths } from "@/router/paths";
import { getWorkloadName } from "@/services/workload";

export default function Tickets() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:tickets.title") },
      ]
    : [{ label: t("pages:workloads.title"), to: Paths.Workloads }, { label: t("pages:tickets.title") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:tickets.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:tickets.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div>
          <DynamicQuery
            title={t("pages:tickets.bugs.title")}
            subtitle={t("pages:tickets.bugs.description")}
            queryTypes={["bugs-new"]}
            defaultInputs={workloadId ? { workloads: [workloadId] } : {}}
            executeOnMount={executeImmediately}
            summarise={["bugs-new"]}
          />
        </div>
        <div>
          <DynamicQuery
            title={t("pages:tickets.incidents.title")}
            subtitle={t("pages:tickets.incidents.description")}
            queryTypes={["production-incidents"]}
            defaultInputs={workloadId ? { workloads: [workloadId] } : {}}
            executeOnMount={executeImmediately}
            summarise={["production-incidents"]}
          />
        </div>
      </div>
    </div>
  );
}
