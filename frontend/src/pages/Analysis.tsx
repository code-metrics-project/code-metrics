import { useSearchParams } from "react-router-dom";
import { PageBreadcrumbs } from "@/components/layout";
import { CodeHotspots } from "@/components/CodeHotspots";
import { DynamicQuery } from "@/components/DynamicQuery";
import { BehindFlag } from "@/components/BehindFlag";
import { Predictions } from "@/components/Predictions";
import { TemporalCoupling } from "@/components/TemporalCoupling";
import { Paths } from "@/router/paths";
import { useI18n } from "@/hooks/useI18n";
import { getWorkloadName } from "@/services/workload";

export default function Analysis() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;

  const breadcrumbs = workloadId
    ? [
        { label: t("nav:workload"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:analysis.title") },
      ]
    : [{ label: t("nav:workload"), to: Paths.Workloads }, { label: t("pages:analysis.title") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:analysis.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:analysis.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div>
          <CodeHotspots workload={workloadId} executeOnMount={executeImmediately} />
        </div>

        <BehindFlag feature="temporalCoupling">
          <div>
            <TemporalCoupling workload={workloadId} executeOnMount={executeImmediately} />
          </div>
        </BehindFlag>

        <div>
          <DynamicQuery
            title="Bugs vs. Coverage"
            subtitle="Correlates bugs vs. coverage."
            queryTypes={["bugs-new", "code-coverage"]}
            defaultInputs={workloadId ? { workloads: [workloadId] } : {}}
          />
        </div>

        <BehindFlag feature="predictions">
          <div>
            <Predictions />
          </div>
        </BehindFlag>
      </div>
    </div>
  );
}
