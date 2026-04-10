import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { useEffect, useState } from "react";
import { PageBreadcrumbs } from "@/components/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { RunDetails, RunDeployment } from "@/components/pipeline";
import { fetchRunById, type RunWithMetadata } from "@/services/pipelines";
import { Paths } from "@/router/paths";
import { getWorkloadName } from "@/services/workload";

export default function PipelineRun() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId") ?? "";
  const jobName = searchParams.get("jobName") ?? "";
  const workloadId = searchParams.get("workloadId") ?? "";
  const stageId = searchParams.get("stageId") ?? "";
  const branchName = searchParams.get("branchName") ?? "";
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: workloadName ?? workloadId, to: `${Paths.Workloads}/${workloadId}` },
        {
          label: t("pages:pipelineRuns.title"),
          to: `${Paths.WorkloadPipelineRuns}?workloadId=${workloadId}&branchName=${branchName}&executeImmediately=true`,
        },
        { label: t("pages:pipelineRun.breadcrumb", { number: runId }) },
      ]
    : [
        { label: t("pages:program.title"), to: Paths.Program },
        { label: t("pages:pipelineRuns.title"), to: Paths.WorkloadPipelineRuns },
        { label: t("pages:pipelineRun.breadcrumb", { number: runId }) },
      ];

  const [item, setItem] = useState<RunWithMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workloadId || !stageId || !jobName || !runId) return;

    fetchRunById(workloadId, stageId, jobName, runId)
      .then((data) => setItem(data))
      .catch((e) => setError(`${t("pages:pipelineRun.notFound")} ${e}`));
  }, [workloadId, stageId, jobName, runId, t]);

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-4xl font-bold">{t("pages:pipelineRun.title")}</h2>
        </div>
      </div>

      {error && (
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto space-y-6 px-4 py-6">
        <div>{item ? <RunDetails item={item} /> : <Skeleton className="h-50 w-full" />}</div>
        <div>
          <h3 className="mb-4 text-xl font-semibold">{t("pages:pipelineRun.deployments")}</h3>
        </div>
        <div>{item ? <RunDeployment item={item} /> : <Skeleton className="h-50 w-full" />}</div>
      </div>
    </div>
  );
}
