import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useParams } from "react-router-dom";
import { capitalize } from "@/utils/string";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageBreadcrumbs } from "@/components/layout";
import {
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ClipboardCheck,
  ClipboardX,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { useQualityGates, type TGate, type TPhase, type TRepo } from "@/queries/useQualityGates";
import { Paths } from "@/router/paths";
import { listWorkloadIds } from "@/config";
import { getWorkloadName } from "@/services/workload";

interface FormattedData {
  id: string;
  message: string;
  service?: string;
  repo: string;
  repoLink: string;
  qualityGates?: TGate;
}

function getVariantClass(variant: string): string {
  const variantMap: Record<string, string> = {
    success: "bg-green-600",
    warning: "bg-yellow-600",
    error: "bg-red-600",
    danger: "bg-red-600",
    info: "bg-blue-600",
    no_data: "bg-zinc-600",
  };
  return variantMap[variant] || "bg-zinc-600";
}

function hasQualityGate(qualityGate: TPhase[]): boolean {
  return !!qualityGate.find((qg) => qg.gates.length);
}

function getQualityGateSummaries(repos: TRepo[], t: (key: string) => string): FormattedData[] {
  if (!repos) return [];
  const fd: FormattedData[] = [];
  repos.forEach((manifest) => {
    if (!manifest.services?.length) {
      fd.push({
        id: manifest.repo || "",
        message: !manifest.services ? t("pages:qualityGates.noManifest") : t("pages:qualityGates.noServiceMatch"),
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
      });
      return;
    }

    manifest.services.forEach((manifestService) => {
      fd.push({
        id: `${manifestService["service-tag"]}-${manifest.repo}`,
        message: "Success",
        service: manifestService["service-tag"],
        repo: manifest.repo || "",
        repoLink: manifest.repoLink || "",
        qualityGates: manifestService["quality-gates"],
      });
    });
  });

  return fd;
}

export default function QualityGates() {
  const { t } = useI18n();
  const { workloadId } = useParams<{ workloadId?: string }>();
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const workloadName = workloadId ? getWorkloadName(workloadId) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:qualityGates.breadcrumb.workloads"), to: Paths.Workloads },
        { label: workloadName ?? workloadId, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:qualityGates.breadcrumb.qualityGates") },
      ]
    : [
        { label: t("pages:qualityGates.breadcrumb.programme"), to: Paths.Program },
        { label: t("pages:qualityGates.breadcrumb.qualityGates") },
      ];

  // Get all workloads if none specified
  const queryWorkloads = useMemo(() => {
    if (workloadId) return [workloadId];
    try {
      return listWorkloadIds();
    } catch {
      return [];
    }
  }, [workloadId]);

  const { data, error, isError, isLoading } = useQualityGates({ workloads: queryWorkloads }, queryWorkloads.length > 0);

  const toggleDetails = (key: string) => {
    setOpenDetails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div>
      <div className="header-section">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-4 text-3xl font-bold">{t("pages:qualityGates.title")}</h2>
          <p className="py-1 text-base">{t("pages:qualityGates.description")}</p>
        </div>
      </div>

      {isError && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("pages:qualityGates.error")}</AlertTitle>
            <AlertDescription>{(error || "").toString()}</AlertDescription>
          </Alert>
        </div>
      )}

      {isLoading && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-12 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((workload, workloadIndex) =>
              workload.repoGroups?.map((repoGroup, repoGroupIndex) => (
                <Card key={`${workloadIndex}-${repoGroupIndex}`}>
                  <div className={`p-4 text-white ${getVariantClass(repoGroup.headline.variant)}`}>
                    <h3 className="text-lg font-semibold">
                      {getWorkloadName(workload.workloadId)} / {repoGroup.repoGroup}
                    </h3>
                  </div>

                  <CardContent className="p-4">
                    <h4 className="text-2xl font-bold">
                      {repoGroup.headline.denominator > 0 ? (
                        <>
                          {t("pages:qualityGates.implemented", {
                            current: repoGroup.headline.numerator,
                            total: repoGroup.headline.denominator,
                          })}
                        </>
                      ) : (
                        t("pages:qualityGates.noData")
                      )}
                    </h4>

                    {repoGroup.headline.missing > 0 && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {t("pages:qualityGates.missingData", { count: repoGroup.headline.missing })}
                      </p>
                    )}

                    <p className="mt-2">
                      <span className="text-muted-foreground">{t("pages:qualityGates.numberOfRepos")} </span>
                      <strong>{repoGroup.repos.length}</strong>
                    </p>
                  </CardContent>

                  <CardFooter className="flex justify-between border-t p-4">
                    <Button variant="ghost">{t("pages:qualityGates.details")}</Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleDetails(`${workload.workloadId}-${repoGroup.repoGroup}`)}
                    >
                      {openDetails.has(`${workload.workloadId}-${repoGroup.repoGroup}`) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CardFooter>

                  {openDetails.has(`${workload.workloadId}-${repoGroup.repoGroup}`) && (
                    <>
                      <Separator />
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("pages:qualityGates.colHeaders.repository")}</TableHead>
                              <TableHead>{t("pages:qualityGates.colHeaders.qualityGates")}</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getQualityGateSummaries(repoGroup.repos, t).map((item) => (
                              <>
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <a
                                      href={item.repoLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary inline-flex items-center gap-1 hover:underline"
                                    >
                                      {item.repo}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    {item.qualityGates && (
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(item.qualityGates).map(([qualityGateName, phases]) => (
                                          <Badge
                                            key={qualityGateName}
                                            variant={hasQualityGate(phases) ? "default" : "destructive"}
                                            className="text-xs"
                                          >
                                            {hasQualityGate(phases) ? (
                                              <ClipboardCheck className="mr-1 h-3 w-3" />
                                            ) : (
                                              <ClipboardX className="mr-1 h-3 w-3" />
                                            )}
                                            {capitalize(qualityGateName)}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {item.service ? (
                                      <Button variant="outline" size="sm" onClick={() => toggleRowExpand(item.id)}>
                                        {expandedRows.has(item.id)
                                          ? t("pages:qualityGates.collapse")
                                          : t("pages:qualityGates.moreInfo")}
                                        {expandedRows.has(item.id) ? (
                                          <ChevronUp className="ml-1 h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="ml-1 h-4 w-4" />
                                        )}
                                      </Button>
                                    ) : (
                                      <p className="text-muted-foreground text-sm">{item.message}</p>
                                    )}
                                  </TableCell>
                                </TableRow>
                                {expandedRows.has(item.id) && item.qualityGates && (
                                  <TableRow key={`${item.id}-expanded`}>
                                    <TableCell colSpan={3} className="p-2">
                                      <div className="bg-muted/50 rounded-lg border p-4">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead></TableHead>
                                              {Object.values(item.qualityGates)[0]?.map((phase) => (
                                                <TableHead key={phase.phase}>{capitalize(phase.phase)}</TableHead>
                                              ))}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {Object.entries(item.qualityGates).map(
                                              ([qualityGateName, qualityGatePhases]) => (
                                                <TableRow key={qualityGateName}>
                                                  <TableCell>{capitalize(qualityGateName)}</TableCell>
                                                  {qualityGatePhases.map((phase, phaseIdx) => (
                                                    <TableCell key={phaseIdx} className="align-top">
                                                      {phase.gates.map((job, jobIdx) => (
                                                        <dl key={jobIdx} className="mb-2 text-xs">
                                                          <div className="flex gap-1">
                                                            <dt>{t("pages:qualityGates.colHeaders.provider")}</dt>
                                                            <dd className="font-bold">{job.provider}</dd>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <dt>{t("pages:qualityGates.colHeaders.file")}</dt>
                                                            <dd className="font-bold">
                                                              <a
                                                                href={job.config.fileURL}
                                                                className="text-primary hover:underline"
                                                              >
                                                                {job.config.file}
                                                              </a>
                                                            </dd>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <dt>{t("pages:qualityGates.colHeaders.path")}</dt>
                                                            <dd className="font-bold">{job.config.path}</dd>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                            <dt>{t("pages:qualityGates.colHeaders.enforced")}</dt>
                                                            <dd>
                                                              {job.isRequiredStatusCheck === true ? (
                                                                <ShieldCheck className="text-primary h-4 w-4" />
                                                              ) : job.isRequiredStatusCheck === false ? (
                                                                <ShieldOff className="text-muted-foreground h-4 w-4" />
                                                              ) : (
                                                                <ShieldAlert className="h-4 w-4 text-yellow-500" />
                                                              )}
                                                            </dd>
                                                          </div>
                                                        </dl>
                                                      ))}
                                                    </TableCell>
                                                  ))}
                                                </TableRow>
                                              )
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
