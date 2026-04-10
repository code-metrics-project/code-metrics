import { useState, useEffect, useRef } from "react";
import { useConfig } from "@/hooks/useConfig";
import { getUrlForRepo } from "@/config";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, Circle, AlertTriangle, ChevronDown, Loader2, GitBranch, BarChart3 } from "lucide-react";
import { WorkloadNames, RepoGroups, DatePicker } from "@/components/inputs";
import { useCodeAnalysis, type CodeAnalysisResult } from "@/queries/useCodeAnalysis";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { useI18n } from "@/hooks/useI18n";

export interface CodeAnalysisAggregateProps {
  title?: string;
  subtitle?: string;
  workloads?: string[];
  aggregateRepos?: boolean;
  executeOnMount?: boolean;
}

function formatDecimal(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

function formatInteger(value: number): string {
  return value.toLocaleString();
}

function getVariantClass(variant: string): string {
  switch (variant) {
    case "success":
      return "bg-green-600";
    case "warning":
      return "bg-yellow-600";
    case "destructive":
    case "danger":
      return "bg-red-600";
    default:
      return "bg-blue-600";
  }
}

export function CodeAnalysisAggregate({
  title,
  subtitle,
  workloads: initialWorkloads = [],
  aggregateRepos = true,
  executeOnMount = false,
}: CodeAnalysisAggregateProps) {
  const { t } = useI18n();
  const [workloadIds, setWorkloadIds] = useState<string[]>(initialWorkloads);
  const [repoGroupsInput, setRepoGroupsInput] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(() => new Date(truncateDateOnly(getOffsetDate(-30))));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date(truncateDateOnly(new Date())));
  const [aggregate, setAggregate] = useState(aggregateRepos);

  // Use translations for default values
  const displayTitle = title ?? t("components:codeAnalysis.title");
  const displaySubtitle = subtitle ?? t("components:codeAnalysis.description");

  const { config, isLoading: isConfigLoading } = useConfig();
  const mutation = useCodeAnalysis();
  const hasAutoExecuted = useRef(false);

  // Store current values in refs to avoid stale closures
  const workloadIdsRef = useRef(workloadIds);
  const repoGroupsInputRef = useRef(repoGroupsInput);
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  const aggregateRef = useRef(aggregate);

  // Keep refs updated
  useEffect(() => {
    workloadIdsRef.current = workloadIds;
    repoGroupsInputRef.current = repoGroupsInput;
    startDateRef.current = startDate;
    endDateRef.current = endDate;
    aggregateRef.current = aggregate;
  }, [workloadIds, repoGroupsInput, startDate, endDate, aggregate]);

  // Auto-execute on mount if requested - wait for config to load first
  useEffect(() => {
    if (
      executeOnMount &&
      !hasAutoExecuted.current &&
      !isConfigLoading &&
      config?.systemConfig != null &&
      workloadIds.length > 0
    ) {
      hasAutoExecuted.current = true;
      queueMicrotask(() => {
        mutation.mutate({
          workloads: workloadIdsRef.current,
          repoGroups: repoGroupsInputRef.current.length > 0 ? repoGroupsInputRef.current : undefined,
          startDate: startDateRef.current?.toISOString().split("T")[0],
          endDate: endDateRef.current?.toISOString().split("T")[0],
          aggregate: aggregateRef.current,
        });
      });
    }
  }, [executeOnMount, isConfigLoading, config?.systemConfig, workloadIds.length, mutation]);

  const runAggregate = () => {
    mutation.mutate({
      workloads: workloadIds,
      repoGroups: repoGroupsInput.length > 0 ? repoGroupsInput : undefined,
      startDate: startDate?.toISOString().split("T")[0],
      endDate: endDate?.toISOString().split("T")[0],
      aggregate,
    });
  };

  const response = mutation.data;
  const results = response?.current ?? [];
  const previousResults = response?.previous ?? [];
  const isLoading = mutation.isPending;

  // Create a lookup map for previous results by name
  const previousByName = new Map(previousResults.map((r) => [r.name, r]));

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{displayTitle}</CardTitle>
        <CardDescription>{displaySubtitle}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="my-4">
          <WorkloadNames defaults={workloadIds} onChange={(w) => setWorkloadIds(w as string[])} disabled={isLoading} />
        </div>
        <div className="my-4">
          <RepoGroups defaults={repoGroupsInput} onChange={(rg) => setRepoGroupsInput(rg)} disabled={isLoading} />
        </div>
        <div className="my-4">
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            label={t("components:filters.startDate")}
            disabled={isLoading}
          />
        </div>
        <div className="my-4">
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            label={t("components:filters.endDate")}
            disabled={isLoading}
          />
        </div>
        <div className="my-4 flex items-center space-x-2">
          <Checkbox
            id="aggregate"
            checked={aggregate}
            onCheckedChange={(c) => setAggregate(!!c)}
            disabled={isLoading}
          />
          <Label htmlFor="aggregate">{t("components:codeAnalysis.aggregateByRepoGroup")}</Label>
        </div>
        <Button variant="default" disabled={isLoading} onClick={runAggregate}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("components:codeAnalysis.running") : t("components:codeAnalysis.runQuery")}
        </Button>
      </CardContent>

      {isLoading && (
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="card-elevated flex flex-col overflow-hidden">
                <Skeleton className="h-12 w-full" />
                <CardContent className="flex-1 pt-4">
                  <Skeleton className="mb-2 h-10 w-1/2" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {results.map((result: CodeAnalysisResult, index: number) => {
              const previous = previousByName.get(result.name);
              const previousCoverage = previous?.summary?.coverage ?? 0;
              const currentCoverage = result.summary?.coverage ?? 0;
              const hasMetrics = currentCoverage > 0 || result.summary?.totalLines > 0;
              const delta = formatDecimal(Math.abs(currentCoverage - previousCoverage), 1);
              const links = result.analysisLinks ?? result.links ?? [];
              const variant =
                result.variant ??
                (currentCoverage >= 80 ? "success" : currentCoverage >= 50 ? "warning" : "destructive");

              return (
                <Card key={index} className="card-elevated group flex flex-col overflow-hidden">
                  <div className={`p-3 ${getVariantClass(variant)}`}>
                    <h3 className="text-sm font-semibold wrap-break-word text-white">{result.name}</h3>
                  </div>

                  <CardContent className="flex-1 pt-4">
                    {hasMetrics ? (
                      <>
                        <p className="text-3xl font-bold">{formatDecimal(currentCoverage, 1)}%</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {currentCoverage < previousCoverage ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
                              <ArrowDown className="h-3 w-3" />
                              {delta}%
                            </span>
                          ) : currentCoverage > previousCoverage ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-green-600 dark:text-green-400">
                              <ArrowUp className="h-3 w-3" />+{delta}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400">
                              <Circle className="h-2 w-2 fill-current" />
                              {t("components:codeAnalysis.noChange")}
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-lg font-medium">
                          {t("components:codeAnalysis.noCoverageData")}
                        </p>
                        {result.staleData && (
                          <p className="text-muted-foreground mt-1 inline-flex items-center text-sm">
                            <AlertTriangle className="mr-1 h-4 w-4 text-amber-500" />
                            {result.staleData}
                          </p>
                        )}
                      </>
                    )}

                    <div className="mt-4 space-y-1.5 text-sm">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{t("components:codeAnalysis.projects")}</span>
                        <strong>{formatInteger(result.numProjects)}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{t("components:codeAnalysis.totalLines")}</span>
                        <strong>{formatInteger(result.summary?.totalLines ?? 0)}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{t("components:codeAnalysis.linesToCover")}</span>
                        <strong>{formatInteger(result.summary?.totalLinesToCover ?? 0)}</strong>
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="border-border/30 border-t pt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          {t("components:codeAnalysis.repositories")}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          {links.map((link, idx) => {
                            // Handle both API field names: 'url' (analysisLinks) and 'codeAnalysisUrl' (legacy)
                            const codeAnalysisUrl = "url" in link ? link.url : link.codeAnalysisUrl;
                            // Get repo URL from config using workloadId and repoName
                            const workloadId = "workloadId" in link ? link.workloadId : result.workloadId;
                            const repoUrl = workloadId && link.repoName ? getUrlForRepo(workloadId, link.repoName) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between py-1">
                                <span className="text-sm">{link.title}</span>
                                <div className="flex items-center gap-1">
                                  {repoUrl && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      asChild
                                      className="h-8 w-8"
                                      title={t("components:codeAnalysis.viewRepository")}
                                    >
                                      <a href={repoUrl} target="_blank" rel="noreferrer">
                                        <GitBranch className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  {codeAnalysisUrl && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      asChild
                                      className="h-8 w-8"
                                      title={t("components:codeAnalysis.viewCodeAnalysis")}
                                    >
                                      <a href={codeAnalysisUrl} target="_blank" rel="noreferrer">
                                        <BarChart3 className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
