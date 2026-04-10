import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Download, GitBranch, Info, Loader2, TableIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DatePicker, WorkloadNames } from "@/components/inputs";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { useTemporalCoupling } from "@/queries/useTemporalCoupling";
import type { TemporalCouplingData } from "@/model/temporalCoupling";
import { useI18n } from "@/hooks/useI18n";
import { CouplingRibbonChart, type CouplingRibbonData } from "@/components/charts";
import { Badge } from "./ui/badge";
import { exportDatasetAsLocalFile } from "@/utils/download";

export interface TemporalCouplingProps {
  workload?: string;
  executeOnMount?: boolean;
}

export function TemporalCoupling({ workload: initialWorkload, executeOnMount = false }: TemporalCouplingProps) {
  const { t } = useI18n();
  const [workloadValue, setWorkloadValue] = useState<string | null>(initialWorkload ?? null);
  const [startDate, setStartDate] = useState<Date | undefined>(() => new Date(truncateDateOnly(getOffsetDate(-30))));
  const [shouldFetch, setShouldFetch] = useState(executeOnMount);
  const [viewMode, setViewMode] = useState<"table" | "ribbon">("ribbon");

  const request = useMemo(
    () => ({
      workload: workloadValue,
      startDate: startDate?.toISOString().split("T")[0] ?? "",
    }),
    [workloadValue, startDate]
  );

  const { data, isError, error, isFetching, refetch } = useTemporalCoupling(request, shouldFetch && !!workloadValue);

  const hasData = !!data && data.length > 0;

  const handleWorkloadChange = useCallback((value: string | string[] | null) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setWorkloadValue(newValue);
  }, []);

  const handleRunAnalysis = useCallback(() => {
    setShouldFetch(true);
    if (shouldFetch) {
      refetch();
    }
  }, [shouldFetch, refetch]);

  const toRibbonData = useCallback((coupling: TemporalCouplingData): CouplingRibbonData => {
    const maxLinks = 30;
    const pairs = coupling.couplingPairs.slice(0, maxLinks);

    const nodeIndexMap = new Map<string, number>();
    const nodes: Array<{ name: string }> = [];

    const getNodeIndex = (name: string) => {
      const existing = nodeIndexMap.get(name);
      if (existing !== undefined) return existing;
      const index = nodes.length;
      nodes.push({ name });
      nodeIndexMap.set(name, index);
      return index;
    };

    const links = pairs.map((pair) => ({
      source: getNodeIndex(pair.fileA),
      target: getNodeIndex(pair.fileB),
      value: pair.coChangeCount,
      percentage: pair.percentage,
      fileA: pair.fileA,
      fileB: pair.fileB,
    }));

    return { nodes, links };
  }, []);

  const csvRows = useMemo(() => {
    if (!data) return [];

    return data.flatMap((coupling) =>
      coupling.couplingPairs.map((pair) => ({
        workload: coupling.workloadId,
        component: coupling.componentName,
        repository: coupling.repoName,
        fileA: pair.fileA,
        fileB: pair.fileB,
        coChanges: String(pair.coChangeCount),
        percentage: pair.percentage.toFixed(1),
        totalAnalyzedPrs: String(coupling.totalCommits),
      }))
    );
  }, [data]);

  const handleDownloadCsv = useCallback(() => {
    if (!csvRows.length) return;
    exportDatasetAsLocalFile(csvRows);
  }, [csvRows]);

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{t("components:temporalCoupling.title")}</CardTitle>
          <Badge variant="outline" className="border-green-500 text-green-500">
            {t("common:badge.new")}
          </Badge>
        </div>
        <CardDescription>{t("components:temporalCoupling.description")}</CardDescription>
      </CardHeader>

      {isError && (
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        </CardContent>
      )}

      {data?.length === 0 && !isFetching && (
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t("components:temporalCoupling.noDataFor", { workload: workloadValue?.toLocaleUpperCase() })}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-1 md:col-span-1 lg:col-span-1">
            <WorkloadNames
              defaults={workloadValue ? [workloadValue] : []}
              multiSelect={false}
              onChange={handleWorkloadChange}
              disabled={isFetching}
            />
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-1">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              label={t("components:filters.startDate")}
              disabled={isFetching}
            />
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="space-y-1">
              <Label>{t("components:temporalCoupling.view")}</Label>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "table" | "ribbon")}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="ribbon"
                  disabled={!hasData}
                  aria-label={t("components:temporalCoupling.ribbonView")}
                >
                  <GitBranch className="mr-1 h-4 w-4" />
                  {t("components:temporalCoupling.ribbon")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="table"
                  disabled={!hasData}
                  aria-label={t("components:temporalCoupling.tableView")}
                >
                  <TableIcon className="mr-1 h-4 w-4" />
                  {t("components:temporalCoupling.table")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </CardContent>

      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t("components:temporalCoupling.analysisInfo")}</AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter>
        <Button variant="default" disabled={!workloadValue || isFetching} onClick={handleRunAnalysis}>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFetching ? t("components:temporalCoupling.analysing") : t("components:temporalCoupling.runAnalysis")}
        </Button>
      </CardFooter>

      {hasData && !isFetching && (
        <>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="understanding">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t("components:temporalCoupling.understandingResults")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <p className="mb-4">
                    <strong>{t("components:temporalCoupling.coChangeCountTitle")}</strong>{" "}
                    {t("components:temporalCoupling.coChangeCountDescription")}
                  </p>
                  <p className="mb-4">
                    <strong>{t("components:temporalCoupling.percentageTitle")}</strong>{" "}
                    {t("components:temporalCoupling.percentageDescription")}
                  </p>
                  <p>
                    <strong>{t("components:temporalCoupling.tightCouplingTitle")}</strong>{" "}
                    {t("components:temporalCoupling.tightCouplingDescription")}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>

          <CardContent>
            <div className="mb-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDownloadCsv} disabled={!csvRows.length}>
                <Download className="mr-2 h-4 w-4" />
                {t("components:codeAnalysis.downloadCsv")}
              </Button>
            </div>

            {data.map((coupling: TemporalCouplingData, index: number) => (
              <section key={index} className="mb-6">
                <h4 className="mb-2 text-lg font-semibold">
                  {t("components:temporalCoupling.analysisOf", { component: coupling.componentName })}
                  <span className="text-muted-foreground ml-2 text-sm">({coupling.repoName})</span>
                </h4>

                {coupling.couplingPairs.length > 0 ? (
                  viewMode === "table" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("components:temporalCoupling.headers.fileA")}</TableHead>
                          <TableHead>{t("components:temporalCoupling.headers.fileB")}</TableHead>
                          <TableHead>{t("components:temporalCoupling.headers.coChanges")}</TableHead>
                          <TableHead>{t("components:temporalCoupling.headers.percentage")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupling.couplingPairs.map((pair, rowIndex) => (
                          <TableRow key={rowIndex}>
                            <TableCell className="font-mono text-sm">{pair.fileA}</TableCell>
                            <TableCell className="font-mono text-sm">{pair.fileB}</TableCell>
                            <TableCell>{pair.coChangeCount}</TableCell>
                            <TableCell>{pair.percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <CouplingRibbonChart data={toRibbonData(coupling)} />
                  )
                ) : (
                  <div className="text-muted-foreground text-sm">
                    <Label>{t("components:temporalCoupling.noSignificantCoupling")}</Label>
                  </div>
                )}
              </section>
            ))}
          </CardContent>
        </>
      )}
    </Card>
  );
}
