import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { PageBreadcrumbs } from "@/components/layout";
import { RunList } from "@/components/pipeline";
import { Paths } from "@/router/paths";
import { getWorkloadName, getWorkloadPipelineFilters } from "@/services/workload";

export default function PipelineRuns() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get("workloadId") ?? undefined;
  const executeImmediately = searchParams.get("executeImmediately") === "true";
  const stageId = searchParams.get("stageId") ?? undefined;
  const branchName = searchParams.get("branchName") ?? undefined;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const jobGroupParam = searchParams.get("jobGroup");
  const jobGroups = jobGroupParam
    ? [jobGroupParam]
    : executeImmediately && workloadId
      ? getWorkloadPipelineFilters(workloadId).jobGroups
      : [];
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: workloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:pipelineRuns.title") },
      ]
    : [{ label: t("pages:program.title"), to: Paths.Program }, { label: t("pages:pipelineRuns.title") }];

  return (
    <div>
      {/* Header */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{t("pages:pipelineRuns.title")}</h2>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <RunList
          workload={workloadId}
          stageId={stageId}
          branchName={branchName}
          jobGroups={jobGroups}
          startDate={startDate}
          endDate={endDate}
          executeOnMount={executeImmediately}
        />
      </div>
    </div>
  );
}
