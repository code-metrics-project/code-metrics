import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Search, CheckCircle2, MinusCircle, XCircle, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { WorkloadNames, DatePicker, JobGroups, PipelineStage } from "@/components/inputs";
import { usePipelineRuns, type PipelineRunsRequest } from "@/queries/usePipelineRuns";
import { type RunRow } from "@/services/pipelines";
import { Paths } from "@/router/paths";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { RunResult } from "@/model/runs";
import { cn } from "@/lib/utils";
import { useConfig } from "@/hooks/useConfig";
import { useI18n } from "@/hooks/useI18n";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

type SortKey = "workloadId" | "date" | "repo" | "duration" | "result";
type SortOrder = "asc" | "desc";

interface RunSummary {
  total: number;
  failed: number;
  succeeded: number;
  aborted: number;
}

export interface RunListProps {
  workload?: string;
  stageId?: string;
  branchName?: string;
  jobGroups?: string[];
  startDate?: string;
  endDate?: string;
  executeOnMount?: boolean;
}

export function RunList({
  workload: initialWorkload,
  stageId: initialStageId = "",
  branchName: initialBranch = "",
  jobGroups: initialJobGroups = [],
  startDate: initialStartDate,
  endDate: initialEndDate,
  executeOnMount = false,
}: RunListProps) {
  const { t } = useI18n();
  const { config, isLoading: isConfigLoading } = useConfig();

  // Get first available stage from config (for default selection)
  const firstAvailableStage = useMemo(() => {
    const workloads = config?.systemConfig?.workloads ?? [];
    for (const workload of workloads) {
      if (workload.pipelineStages?.length) {
        return workload.pipelineStages[0];
      }
    }
    return "";
  }, [config?.systemConfig?.workloads]);

  // Form state
  const [workloads, setWorkloads] = useState<string[]>(initialWorkload ? [initialWorkload] : []);
  const [branch] = useState(initialBranch);
  const [stageId, setStageId] = useState<string | undefined>(initialStageId || undefined);
  const [jobGroups, setJobGroups] = useState<string[]>(initialJobGroups);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    if (initialStartDate) return new Date(initialStartDate);
    return new Date(truncateDateOnly(getOffsetDate(-7)));
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (initialEndDate) return new Date(initialEndDate);
    return new Date(truncateDateOnly(new Date()));
  });

  // Display options
  const [showRepository, setShowRepository] = useState(false);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<RunResult | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Query control - only enable after user clicks button or auto-execute fires
  const [shouldFetch, setShouldFetch] = useState(false);
  const hasAutoExecuted = useRef(false);

  // Use stageId from state, or fall back to first available
  const effectiveStageId = stageId ?? firstAvailableStage;

  const request: PipelineRunsRequest = {
    workloads,
    stageId: effectiveStageId,
    jobGroups,
    branch,
    startDate: startDate || new Date(),
    endDate: endDate || new Date(),
  };

  // Query is enabled when user has triggered fetch AND we have required data
  const canFetch = workloads.length > 0 && effectiveStageId !== "";
  const queryEnabled = shouldFetch && canFetch;

  const { data: runs, isLoading: isQueryLoading, refetch } = usePipelineRuns(request, queryEnabled);

  // Auto-execute once when config is ready (if executeOnMount is true)
  // Use a microtask to avoid the "setState in effect" lint warning
  useEffect(() => {
    if (
      executeOnMount &&
      !hasAutoExecuted.current &&
      !isConfigLoading &&
      config?.systemConfig != null &&
      workloads.length > 0 &&
      firstAvailableStage !== ""
    ) {
      hasAutoExecuted.current = true;
      // Schedule state update for next tick to avoid cascading renders
      queueMicrotask(() => setShouldFetch(true));
    }
  }, [executeOnMount, isConfigLoading, config?.systemConfig, workloads.length, firstAvailableStage]);

  const isLoading = isQueryLoading;

  // Calculate summary
  const summary = useMemo<RunSummary | null>(() => {
    if (!runs || runs.length === 0) return null;
    return {
      total: runs.length,
      failed: runs.filter((r) => r.result === RunResult.Failed).length,
      succeeded: runs.filter((r) => r.result === RunResult.Succeeded).length,
      aborted: runs.filter((r) => r.result === RunResult.Aborted).length,
    };
  }, [runs]);

  // Filter and sort runs
  const filteredRuns = useMemo(() => {
    if (!runs) return [];

    let result = [...runs];

    // Apply result filter
    if (resultFilter !== null) {
      result = result.filter((r) => r.result === resultFilter);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.workloadId?.toLowerCase().includes(searchLower) ||
          r.title?.toLowerCase().includes(searchLower) ||
          r.repo?.toLowerCase().includes(searchLower) ||
          r.result?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "workloadId":
          comparison = (a.workloadId || "").localeCompare(b.workloadId || "");
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "repo":
          comparison = (a.repo || "").localeCompare(b.repo || "");
          break;
        case "duration":
          comparison = a.duration - b.duration;
          break;
        case "result":
          comparison = (a.result || "").localeCompare(b.result || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [runs, resultFilter, search, sortKey, sortOrder]);

  const handleFetch = useCallback(() => {
    if (shouldFetch) {
      refetch();
    } else {
      setShouldFetch(true);
    }
  }, [shouldFetch, refetch]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const tableHeaders: { title: string; key: SortKey | null; sortable: boolean }[] = [
    { title: t("components:pipelineRuns.tableHeaders.workload"), key: "workloadId", sortable: true },
    { title: t("components:pipelineRuns.tableHeaders.job"), key: null, sortable: false },
    { title: t("components:pipelineRuns.tableHeaders.date"), key: "date", sortable: true },
    ...(showRepository
      ? [{ title: t("components:pipelineRuns.tableHeaders.repository"), key: "repo" as SortKey, sortable: true }]
      : []),
    { title: t("components:pipelineRuns.tableHeaders.duration"), key: "duration", sortable: true },
    { title: t("components:pipelineRuns.tableHeaders.outcome"), key: "result", sortable: true },
  ];

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:pipelineRuns.title")}</CardTitle>
        <CardDescription>{t("components:pipelineRuns.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 space-y-4 lg:col-span-9">
            <WorkloadNames
              defaults={workloads}
              onChange={(w) => setWorkloads(Array.isArray(w) ? w : w ? [w] : [])}
              disabled={isLoading}
              multiSelect={false}
            />
            <JobGroups value={jobGroups} onChange={setJobGroups} disabled={isLoading} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                label={t("components:inputs.labels.startDate")}
                disabled={isLoading}
              />
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                label={t("components:inputs.labels.endDate")}
                disabled={isLoading}
              />
            </div>
            <PipelineStage value={stageId || effectiveStageId} onChange={setStageId} disabled={isLoading} />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <p className="text-muted-foreground mt-4 mb-2 text-sm">{t("components:pipelineRuns.display")}</p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showRepository"
                checked={showRepository}
                onCheckedChange={(checked) => setShowRepository(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="showRepository">{t("components:pipelineRuns.showRepository")}</Label>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="default" disabled={isLoading || !canFetch} onClick={handleFetch}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t("components:pipelineRuns.loadingRuns") : t("components:pipelineRuns.showRuns")}
          </Button>
        </div>
      </CardContent>

      {/* Summary section */}
      {summary && (
        <div className="bg-muted mx-4 mb-4 rounded-lg p-4">
          <p className="text-muted-foreground mb-2 text-sm font-bold">{t("components:pipelineRuns.summary")}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              className={cn(
                "cursor-pointer font-medium hover:underline",
                resultFilter === null && "text-primary underline"
              )}
              onClick={() => setResultFilter(null)}
            >
              {t("components:pipelineRuns.runsCount", { count: summary.total })}
            </button>
            <button
              className={cn(
                "inline-flex cursor-pointer items-center hover:underline",
                resultFilter === RunResult.Failed && "text-primary underline"
              )}
              onClick={() => setResultFilter(resultFilter === RunResult.Failed ? null : RunResult.Failed)}
            >
              <XCircle className="mr-1 h-4 w-4 text-red-500" />
              {t("components:pipelineRuns.failed")}: {summary.failed}
            </button>
            <button
              className={cn(
                "inline-flex cursor-pointer items-center hover:underline",
                resultFilter === RunResult.Succeeded && "text-primary underline"
              )}
              onClick={() => setResultFilter(resultFilter === RunResult.Succeeded ? null : RunResult.Succeeded)}
            >
              <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
              {t("components:pipelineRuns.succeeded")}: {summary.succeeded}
            </button>
            <button
              className={cn(
                "inline-flex cursor-pointer items-center hover:underline",
                resultFilter === RunResult.Aborted && "text-primary underline"
              )}
              onClick={() => setResultFilter(resultFilter === RunResult.Aborted ? null : RunResult.Aborted)}
            >
              <MinusCircle className="mr-1 h-4 w-4 text-orange-500" />
              {t("components:pipelineRuns.aborted")}: {summary.aborted}
            </button>
          </div>
        </div>
      )}

      {/* Search header */}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("components:pipelineRuns.runs")}</span>
          <div className="relative w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common:search")}
              className="pl-10"
            />
          </div>
        </CardTitle>
      </CardHeader>

      {isLoading && (
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      )}

      {!isLoading && filteredRuns.length > 0 && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {tableHeaders.map((header) => (
                  <TableHead
                    key={header.title}
                    className={header.sortable ? "hover:bg-muted/50 cursor-pointer select-none" : ""}
                    onClick={() => header.sortable && header.key && toggleSort(header.key)}
                  >
                    <div className="flex items-center gap-1">
                      {header.title}
                      {header.sortable && header.key && (
                        <>
                          {sortKey === header.key && sortOrder === "asc" && <ArrowUp className="h-4 w-4" />}
                          {sortKey === header.key && sortOrder === "desc" && <ArrowDown className="h-4 w-4" />}
                          {sortKey !== header.key && <ArrowUpDown className="text-muted-foreground/50 h-4 w-4" />}
                        </>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run: RunRow) => (
                <TableRow key={run.key}>
                  <TableCell>{run.workloadId}</TableCell>
                  <TableCell>
                    <Button variant="link" asChild className="h-auto p-0">
                      <Link
                        to={`${Paths.WorkloadPipelineRun}?workloadId=${run.workloadId}&stageId=${run.stageId}&branchName=${branch}&jobName=${run.job}&runId=${run.id}`}
                      >
                        {run.title}
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell>{new Date(run.date).toLocaleString()}</TableCell>
                  {showRepository && <TableCell>{run.repo}</TableCell>}
                  <TableCell>{formatDuration(run.duration)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center whitespace-nowrap">
                      {run.result === RunResult.Succeeded && <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />}
                      {run.result === RunResult.Aborted && <MinusCircle className="mr-1 h-4 w-4 text-orange-500" />}
                      {run.result === RunResult.Failed && <XCircle className="mr-1 h-4 w-4 text-red-500" />}
                      {run.result}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}

      {!isLoading && shouldFetch && filteredRuns.length === 0 && (
        <CardContent>
          <p className="text-muted-foreground py-8 text-center">{t("components:pipelineRuns.noRuns")}</p>
        </CardContent>
      )}
    </Card>
  );
}
