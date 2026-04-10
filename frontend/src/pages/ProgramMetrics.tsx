import { PageBreadcrumbs } from "@/components/layout";
import { CodeAnalysisAggregate } from "@/components/CodeAnalysisAggregate";
import { CodeAnalysisMetricHistory } from "@/components/CodeAnalysisMetricHistory";
import { DynamicQuery } from "@/components/DynamicQuery";
import { Paths } from "@/router/paths";
import { getCodeQualityDefaults } from "@/queries/queryDefaults";
import { useI18n } from "@/hooks/useI18n";

export default function ProgramMetrics() {
  const { t } = useI18n();
  const breadcrumbs = [{ label: t("nav:programme"), to: Paths.Program }, { label: t("nav:programmeMetrics") }];

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-4xl font-bold">{t("pages:program.metrics.title")}</h2>
        </div>
      </div>

      <div className="container mx-auto space-y-6 px-4 py-6">
        <div>
          <CodeAnalysisAggregate />
        </div>

        <div>
          <CodeAnalysisMetricHistory />
        </div>

        <div>
          <DynamicQuery
            title={t("pages:program.metrics.repositoryChurnTitle")}
            subtitle={t("pages:program.metrics.repositoryChurnSubtitle")}
            queryTypes={["repo-churn"]}
            defaultInputs={getCodeQualityDefaults()}
          />
        </div>
      </div>
    </div>
  );
}
