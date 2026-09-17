import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";
import { PipelineOutcomes } from "@/components/pipeline";
import { Paths } from "@/router/paths";
import { InputType } from "@/components/inputs";
import { listPipelineStages } from "@/config";
import { getWorkloadName } from "@/services/workload";

export default function PipelineHealth() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  // Fall back to the first configured pipeline stage, as the legacy app does.
  const stageId = searchParams.get("stageId") || listPipelineStages()[0];
  const branchName = searchParams.get("branchName") ?? undefined;
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:pipelineHealth.title") },
      ]
    : [{ label: t("pages:program.title"), to: Paths.Program }, { label: t("pages:program.pipelines.title") }];

  // Hide tags input
  const hideInputs = [InputType.TAGS];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:pipelineHealth.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("pages:pipelineHealth.description")}</p>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <PipelineOutcomes
          workload={workloadId}
          branchName={branchName}
          stageId={stageId}
          hideInputs={hideInputs}
          executeOnMount={executeImmediately}
        />
      </div>
    </div>
  );
}
