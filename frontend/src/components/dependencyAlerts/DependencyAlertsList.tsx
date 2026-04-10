import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink } from "lucide-react";
import { WorkloadNames, RepoNames, RepoGroups, TagInput } from "@/components/inputs";
import { useDependencyAlerts } from "@/queries/useDependencyAlerts";
import { aggregatePackageAlerts, type DependencyAlertsAnalysis } from "@/services/dependencyAlerts";
import { listWorkloadIds, getReposForWorkloadId } from "@/config";
import type { Tags } from "@/model/tags";
import PackageAlertsTable from "./PackageAlertsTable";
import { useI18n } from "@/hooks/useI18n";

const orderedSeverities = ["critical", "high", "medium", "low"];

function getSeverityClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-600 text-white";
    case "medium":
      return "bg-yellow-600 text-white";
    case "low":
      return "bg-blue-600 text-white";
    default:
      return "";
  }
}

export interface DependencyAlertsListProps {
  workloadIds?: string[];
  repoName?: string;
  repoGroups?: string[];
  executeOnMount?: boolean;
}

export function DependencyAlertsList({
  workloadIds: initialWorkloadIds = [],
  repoName: initialRepoName,
  repoGroups: initialRepoGroups = [],
  executeOnMount = false,
}: DependencyAlertsListProps) {
  const { t } = useI18n();

  const violationHeaders = [
    { title: t("components:dependencyAlerts.tableHeaders.alertNumber"), key: "number" },
    { title: t("components:dependencyAlerts.tableHeaders.severity"), key: "severity" },
    { title: t("components:dependencyAlerts.tableHeaders.state"), key: "state" },
    { title: t("components:dependencyAlerts.tableHeaders.package"), key: "package" },
    { title: t("components:dependencyAlerts.tableHeaders.title"), key: "title" },
    { title: t("components:dependencyAlerts.tableHeaders.ageDays"), key: "age" },
    { title: t("components:dependencyAlerts.tableHeaders.slaDays"), key: "slaLimit" },
    { title: t("components:dependencyAlerts.tableHeaders.daysOverdue"), key: "daysOverdue" },
    { title: t("components:dependencyAlerts.tableHeaders.link"), key: "htmlUrl" },
  ];

  const [workloads, setWorkloads] = useState<string[]>(() => {
    if (initialWorkloadIds.length > 0) return initialWorkloadIds;
    try {
      return listWorkloadIds();
    } catch {
      return [];
    }
  });
  const [tags, setTags] = useState<Tags>([]);
  const [repoName, setRepoName] = useState<string | undefined>(initialRepoName);
  const [repoGroupsInput, setRepoGroupsInput] = useState<string[]>(initialRepoGroups);
  const [shouldExecute, setShouldExecute] = useState(executeOnMount);

  // Calculate available repo names based on selected workloads
  const repoNames = useMemo(() => {
    if (workloads.length === 0) {
      return [];
    }

    const allRepos = new Set<string>();
    const workloadIdsToProcess = workloads.includes("all") ? listWorkloadIds() : workloads;

    workloadIdsToProcess.forEach((workloadId) => {
      const repos = getReposForWorkloadId(workloadId);
      repos.forEach((repo) => allRepos.add(repo));
    });

    return Array.from(allRepos).sort();
  }, [workloads]);

  // Clear selected repo if it's no longer valid for the selected workloads
  useEffect(() => {
    if (repoName && !repoNames.includes(repoName)) {
      setRepoName(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoNames]);

  const {
    data: analyses,
    isLoading,
    refetch,
  } = useDependencyAlerts(
    {
      workloads,
      repo: repoName,
      repoGroups: repoGroupsInput.length > 0 ? repoGroupsInput : undefined,
      tags: tags.length > 0 ? tags : undefined,
    },
    shouldExecute && workloads.length > 0 && (!!repoName || repoGroupsInput.length > 0)
  );

  const handleFetch = useCallback(() => {
    setShouldExecute(true);
    if (shouldExecute) {
      refetch();
    }
  }, [shouldExecute, refetch]);

  // Calculate total summary
  const totalSummary = useMemo(() => {
    if (!analyses || analyses.length === 0) return null;

    let total = 0;
    let openViolations = 0;

    for (const analysis of analyses) {
      total += analysis.total;
      openViolations += analysis.summary?.openViolations || 0;
    }

    const complianceRate = total > 0 ? Math.round(((total - openViolations) / total) * 100) : 100;

    return { total, openViolations, complianceRate };
  }, [analyses]);

  // Aggregate packages across all analyses using the service function
  const aggregatedPackages = useMemo(() => {
    if (!analyses || analyses.length === 0) return [];
    return aggregatePackageAlerts(analyses);
  }, [analyses]);

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:dependencyAlerts.title")}</CardTitle>
        <CardDescription>{t("components:dependencyAlerts.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WorkloadNames
            defaults={workloads}
            onChange={(w) => setWorkloads(Array.isArray(w) ? w : w ? [w] : [])}
            disabled={isLoading}
          />
          <TagInput defaults={tags} onChange={(t) => setTags(t)} disabled={isLoading} />
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground mb-2 text-sm">{t("components:dependencyAlerts.chooseRepoOrGroup")}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RepoGroups
              defaults={repoGroupsInput}
              onChange={(rg) => {
                setRepoGroupsInput(rg);
                if (rg.length > 0) setRepoName(undefined);
              }}
              disabled={isLoading || !!repoName}
              skipDefaultSelection={!!initialRepoName}
            />
            <RepoNames
              defaults={repoName}
              onChange={(r) => {
                setRepoName(r);
                if (r) setRepoGroupsInput([]);
              }}
              disabled={isLoading || repoGroupsInput.length > 0}
              repos={repoNames}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="default" disabled={isLoading} onClick={handleFetch}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t("components:dependencyAlerts.fetchingAlerts") : t("components:dependencyAlerts.fetchAlerts")}
          </Button>
        </div>
      </CardContent>

      {isLoading && (
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      )}

      {analyses && analyses.length > 0 && (
        <>
          <CardHeader>
            <CardTitle>{t("components:dependencyAlerts.alertSummary")}</CardTitle>
          </CardHeader>

          {totalSummary && (
            <div className="bg-muted mx-4 rounded-lg p-4">
              <p className="text-muted-foreground mb-2 text-sm font-bold">
                {t("components:dependencyAlerts.overallSummary")}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">
                  {t("components:dependencyAlerts.totalAlerts", { count: totalSummary.total })}
                </span>
                <span className="inline-flex items-center">
                  <AlertCircle className="mr-1 h-4 w-4 text-red-500" />
                  {t("components:dependencyAlerts.openViolations")}: {totalSummary.openViolations}
                </span>
                <span className="inline-flex items-center">
                  <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                  {t("components:dependencyAlerts.compliance")}: {totalSummary.complianceRate}%
                </span>
              </div>
            </div>
          )}

          <PackageAlertsTable
            packageSummaries={aggregatedPackages}
            title={t("components:dependencyAlerts.alertsByPackageAll")}
          />

          {analyses.map((analysis: DependencyAlertsAnalysis) => (
            <div key={`${analysis.workloadId}-${analysis.repo}`} className="px-4">
              <div className="mt-4 mb-2 flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {analysis.workloadId} - {analysis.repo}
                </h3>
                <Badge variant="secondary">{t("components:dependencyAlerts.alerts", { count: analysis.total })}</Badge>
                {analysis.warningMessage && (
                  <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {analysis.warningMessage}
                  </Badge>
                )}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t("components:dependencyAlerts.byState")}</p>
                    {Object.entries(analysis.byState).map(([state, count]) => (
                      <div key={state} className="flex items-center gap-2">
                        <Badge variant="secondary">{state}</Badge>
                        {count}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t("components:dependencyAlerts.bySeverity")}</p>
                    {orderedSeverities.map((severity) =>
                      analysis.bySeverity[severity] ? (
                        <div key={severity} className="flex items-center gap-2">
                          <Badge className={getSeverityClass(severity)}>{severity}</Badge>
                          {analysis.bySeverity[severity]}
                        </div>
                      ) : null
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">{t("components:dependencyAlerts.slaCompliance")}</p>
                    {analysis.warningMessage ? (
                      <div className="flex items-center">
                        <HelpCircle className="mr-1 h-4 w-4 text-gray-500" />
                        {t("components:dependencyAlerts.unknown")}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center">
                          {(analysis.summary?.openViolations || 0) > 0 ? (
                            <AlertCircle className="mr-1 h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                          )}
                          {t("components:dependencyAlerts.compliant", {
                            rate: analysis.summary?.complianceRate || "0",
                          })}
                        </div>
                        {(analysis.summary?.openViolations || 0) > 0 && (
                          <Badge variant="destructive" className="mt-2">
                            {t("components:dependencyAlerts.openViolationsCount", {
                              count: analysis.summary.openViolations,
                            })}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {analysis.slaViolations && analysis.slaViolations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md mb-2 font-semibold">{t("components:dependencyAlerts.slaViolations")}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {violationHeaders.map((header) => (
                          <TableHead key={header.key}>{header.title}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.slaViolations
                        .sort((a, b) => b.daysOverdue - a.daysOverdue)
                        .map((item) => (
                          <TableRow key={item.number}>
                            <TableCell>{item.number}</TableCell>
                            <TableCell>
                              <Badge className={getSeverityClass(item.severity)}>{item.severity}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.state === "open" ? "destructive" : "secondary"}>{item.state}</Badge>
                            </TableCell>
                            <TableCell>{item.package}</TableCell>
                            <TableCell>{item.title}</TableCell>
                            <TableCell>{item.age}</TableCell>
                            <TableCell>{item.slaLimit}</TableCell>
                            <TableCell>{item.daysOverdue}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <a href={item.htmlUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <PackageAlertsTable
                packageSummaries={Object.values(analysis.byPackage || {})}
                title={t("components:dependencyAlerts.alertsByPackageRepo", { repo: analysis.repo })}
              />
            </div>
          ))}
        </>
      )}
    </Card>
  );
}
