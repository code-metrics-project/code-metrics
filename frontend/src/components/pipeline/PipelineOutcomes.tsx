import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { DynamicInputs, InputType, type QueryArgs } from "@/components/inputs";
import { DoughnutChart } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { listWorkloadIds } from "@/config";
import { usePipelineHealthOutcomes } from "@/queries/usePipelineHealthOutcomes";

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
  const { outcomes, isBusy, error, hasExecuted, execute } = usePipelineHealthOutcomes();

  // A single shared set of filters applies to all selected workloads,
  // mirroring the legacy pipeline health screen.
  const defaultInputs: QueryArgs = {
    workloads: workload ? [workload] : listWorkloadIds(),
    ...(stageId ? { stageId } : {}),
    ...(branchName ? { branchNames: [branchName] } : {}),
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:pipelineOutcomes.title")}</CardTitle>
        <CardDescription>{t("components:pipelineOutcomes.description")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <DynamicInputs
          queryTypes={["pipeline-runs"]}
          queryName="Pipeline outcomes"
          defaultInputs={defaultInputs}
          hideInputs={[InputType.TAGS, ...hideInputs]}
          isBusy={isBusy}
          executeOnMount={executeOnMount}
          onExecute={execute}
          stackInputs={true}
        />

        <h5 className="text-muted-foreground mt-8 mb-3 text-sm font-medium">{t("components:pipelineOutcomes.results")}</h5>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("components:pipelineOutcomes.error")}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : outcomes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {outcomes.map((outcome) => (
              <Card key={outcome.key} className="flex flex-col gap-3 py-3">
                <CardHeader className="flex items-baseline justify-between gap-2 px-3">
                  <CardTitle className="truncate text-sm" title={outcome.key}>
                    {outcome.key}
                  </CardTitle>
                  <span className="text-lg font-bold">{Math.round(outcome.success)}%</span>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col px-3">
                  <DoughnutChart
                    chartData={outcome.chartData}
                    height={320}
                    className="mx-auto aspect-auto h-80 max-w-72"
                    innerRadius="40%"
                    outerRadius="65%"
                    showToolbar={false}
                  />
                  {outcome.runsUrl && (
                    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                      <Link to={outcome.runsUrl}>{t("components:pipelineOutcomes.showRuns")}</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : hasExecuted ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            {t("components:pipelineOutcomes.noData")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
