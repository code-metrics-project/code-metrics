import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DynamicInputs, InputType, type QueryArgs } from "@/components/inputs";
import { WorkloadNames } from "@/components/inputs/WorkloadNames";
import { DoughnutChart } from "@/components/charts";
import { usePipelineOutcomesPerJobGroup } from "@/queries/usePipelineOutcomesPerJobGroup";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { ActorType } from "../inputs/PipelineActors";
import { useI18n } from "@/hooks/useI18n";
import { useConfig } from "@/hooks/useConfig";
import { Paths } from "@/router/paths";

interface WorkloadQueryProps {
  workloadId: string;
  queryArgs: QueryArgs;
  enabled: boolean;
  hideInputs: InputType[];
  executeOnMount?: boolean;
}

function WorkloadOutcomeCard({
  workloadId,
  queryArgs,
  enabled,
  hideInputs,
  executeOnMount = false,
}: WorkloadQueryProps) {
  const { t } = useI18n();
  const { config, isLoading: isConfigLoading } = useConfig();

  const workloadJobGroups = useMemo<string[]>(() => {
    const workloads = config?.systemConfig?.workloads ?? [];
    const currentWorkload = workloads.find((item) => item.id === workloadId);
    if (!currentWorkload?.jobs) {
      return [];
    }
    return Object.keys(currentWorkload.jobs).sort();
  }, [config?.systemConfig?.workloads, workloadId]);

  const withDefaultJobGroups = useMemo(() => {
    return (args: QueryArgs): QueryArgs => {
      if (Array.isArray(args.jobGroups) && args.jobGroups.length > 0) {
        return args;
      }
      if (workloadJobGroups.length === 0) {
        return args;
      }
      return {
        ...args,
        jobGroups: workloadJobGroups,
      };
    };
  }, [workloadJobGroups]);

  const [localQueryArgs, setLocalQueryArgs] = useState<QueryArgs>(() => withDefaultJobGroups(queryArgs));
  const [committedQueryArgs, setCommittedQueryArgs] = useState<QueryArgs>(() => withDefaultJobGroups(queryArgs));
  const [queryVersion, setQueryVersion] = useState(0);
  const [isExecuted, setIsExecuted] = useState<boolean>(() => {
    if (!executeOnMount) {
      return false;
    }
    const initial = withDefaultJobGroups(queryArgs);
    const hasJobGroups = Array.isArray(initial.jobGroups) && initial.jobGroups.length > 0;
    return hasJobGroups || !isConfigLoading;
  });

  useEffect(() => {
    setLocalQueryArgs((prev) => withDefaultJobGroups(prev));
    setCommittedQueryArgs((prev) => withDefaultJobGroups(prev));
  }, [withDefaultJobGroups]);

  useEffect(() => {
    if (!executeOnMount || isExecuted || isConfigLoading) {
      return;
    }

    const nextArgs = withDefaultJobGroups(localQueryArgs);
    setLocalQueryArgs(nextArgs);
    setCommittedQueryArgs(nextArgs);
    setIsExecuted(true);
    setQueryVersion((v) => v + 1);
  }, [executeOnMount, isExecuted, isConfigLoading, localQueryArgs, withDefaultJobGroups]);

  const {
    data: outcomes,
    isLoading,
    isError,
    error,
  } = usePipelineOutcomesPerJobGroup(
    { ...committedQueryArgs, workloads: [workloadId] },
    enabled && isExecuted,
    `${workloadId}-v${queryVersion}`
  );

  const handleInput = (args: QueryArgs) => {
    setLocalQueryArgs(args);
  };

  const handleExecute = () => {
    setCommittedQueryArgs(localQueryArgs);
    setIsExecuted(true);
    setQueryVersion((v) => v + 1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-5 w-2/3" />
            <Skeleton className="mx-auto h-8 w-1/2" />
            <Skeleton className="mx-auto h-32 w-32 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          <Link to={`${Paths.Workloads}/${workloadId}`} className="hover:underline">
            {workloadId}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)] xl:items-start">
          <div className="space-y-3">
            <h5 className="text-muted-foreground text-sm font-medium">
              {t("components:pipelineOutcomes.queryFilters")}
            </h5>
            <div className="space-y-2">
              <DynamicInputs
                queryTypes={["pipeline-runs"]}
                queryName={`Filters for ${workloadId}`}
                defaultInputs={localQueryArgs}
                hideInputs={[InputType.WORKLOAD_NAMES, ...hideInputs]}
                isBusy={isLoading}
                executeOnMount={false}
                onInput={handleInput}
                onExecute={handleExecute}
                stackInputs={true}
              />
            </div>
          </div>

          <div className="border-t pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
            <h5 className="text-muted-foreground mb-3 text-sm font-medium">
              {t("components:pipelineOutcomes.results")}
            </h5>
            {isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("components:pipelineOutcomes.error")}</AlertTitle>
                <AlertDescription>{(error || "").toString()}</AlertDescription>
              </Alert>
            ) : outcomes && outcomes.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {outcomes.map((outcome) => (
                  <div key={outcome.key} className="bg-muted/20 h-full space-y-2 rounded-lg border p-3 text-center">
                    <h4 className="truncate text-sm font-semibold" title={outcome.key}>
                      {outcome.key}
                    </h4>
                    <p className="text-xl font-bold">{Math.round(outcome.success)}%</p>
                    <p className="text-muted-foreground text-sm">
                      {t("components:pipelineOutcomes.totalRuns", { count: outcome.total })}
                    </p>
                    <div className="mx-auto w-full max-w-125">
                      <DoughnutChart
                        chartData={{
                          labels: outcome.chartData.labels.map((label, index) => {
                            const value = outcome.chartData.datasets[0].data[index] ?? 0;
                            const normalizedLabel = label.replace(/^runs-/, "").replace(/-/g, " ");
                            return `${normalizedLabel} (${value})`;
                          }),
                          data: outcome.chartData.datasets[0].data,
                          colors: outcome.chartData.datasets[0].backgroundColor,
                        }}
                        className="aspect-square"
                        height={520}
                      />
                    </div>
                    {outcome.runsUrl && (
                      <Button asChild variant="link" size="sm" className="mt-2">
                        <Link to={outcome.runsUrl}>{t("components:pipelineOutcomes.showRuns")}</Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {t("components:pipelineOutcomes.noData")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface PipelineOutcomesProps {
  workload?: string;
  branchName?: string;
  stageId?: string;
  hideInputs?: InputType[];
  executeOnMount?: boolean;
}

export function PipelineOutcomes({
  workload,
  branchName,
  stageId,
  hideInputs = [],
  executeOnMount = false,
}: PipelineOutcomesProps) {
  const { t } = useI18n();
  // Separate workload selection from other query args
  const [selectedWorkloads, setSelectedWorkloads] = useState<string[]>(workload ? [workload] : []);

  // Initialize with sensible defaults ready for immediate query execution
  const baseQueryArgs = useMemo<QueryArgs>(
    () => ({
      ...(stageId ? { stageId } : {}),
      branchNames: branchName ? [branchName] : [],
      startDate: truncateDateOnly(getOffsetDate(-30)),
      actorType: ActorType.All,
      jobGroups: [],
    }),
    [stageId, branchName]
  );

  const handleWorkloadChange = (workloads: string | string[] | null) => {
    const newWorkloads = Array.isArray(workloads) ? workloads : workloads ? [workloads] : [];
    setSelectedWorkloads(newWorkloads);
  };

  // Hide workloads input as we have a separate dropdown
  const computedHideInputs = [...hideInputs, InputType.WORKLOAD_NAMES];

  // Ensure all key inputs have explicit values so DynamicInputs selects them
  const queryArgsWithDefaults = useMemo(
    () => ({
      ...baseQueryArgs,
      // Explicitly set all values to ensure they're selected in DynamicInputs
      branchNames: Array.isArray(baseQueryArgs.branchNames) ? baseQueryArgs.branchNames : [],
      startDate: baseQueryArgs.startDate || truncateDateOnly(getOffsetDate(-30)),
      actorType: baseQueryArgs.actorType || ActorType.All,
      jobGroups: Array.isArray(baseQueryArgs.jobGroups) ? baseQueryArgs.jobGroups : [],
    }),
    [baseQueryArgs]
  );

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:pipelineOutcomes.title")}</CardTitle>
        <CardDescription>{t("components:pipelineOutcomes.description")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Global workload dropdown - select which workloads to analyze */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">{t("components:pipelineOutcomes.selectWorkloads")}</label>
          <WorkloadNames
            defaults={selectedWorkloads}
            multiSelect={true}
            disabled={false}
            onChange={handleWorkloadChange}
          />
        </div>

        {/* Individual workload cards with per-workload inputs and results */}
        {selectedWorkloads.length > 0 ? (
          <div className="space-y-6">
            {selectedWorkloads.map((workloadId) => (
              <WorkloadOutcomeCard
                key={workloadId}
                workloadId={workloadId}
                queryArgs={queryArgsWithDefaults}
                enabled={true}
                hideInputs={computedHideInputs}
                executeOnMount={executeOnMount}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground py-12 text-center">
            <p>{t("components:pipelineOutcomes.selectWorkloadsPrompt")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
