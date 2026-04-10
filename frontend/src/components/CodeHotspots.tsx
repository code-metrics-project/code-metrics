import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, AlertCircle, Info, TableIcon, LayoutGrid } from "lucide-react";
import { WorkloadNames, DatePicker } from "@/components/inputs";
import { useCodeHotspots, type RepoData } from "@/queries/useCodeHotspots";
import { useIssueTypes } from "@/queries/useIssueTypes";
import { Combobox } from "@/components/ui/combobox";
import { TreemapChart } from "@/components/charts/TreemapChart";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { useI18n } from "@/hooks/useI18n";

export interface CodeHotspotsProps {
  workload?: string;
  executeOnMount?: boolean;
}

export function CodeHotspots({ workload: initialWorkload, executeOnMount = false }: CodeHotspotsProps) {
  const { t } = useI18n();
  const [workloadValue, setWorkloadValue] = useState<string | null>(initialWorkload ?? null);
  const [startDate, setStartDate] = useState<Date | undefined>(() => new Date(truncateDateOnly(getOffsetDate(-30))));
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [shouldFetch, setShouldFetch] = useState(executeOnMount);
  const [viewMode, setViewMode] = useState<"table" | "heatmap">("heatmap");

  const headers = [
    { title: t("components:codeHotspots.headers.filePath"), key: "path" },
    { title: t("components:codeHotspots.headers.issueRelatedChanges"), key: "count" },
    { title: t("components:codeHotspots.headers.tickets"), key: "issueLinks" },
    { title: t("components:codeHotspots.headers.testCoverage"), key: "coverage" },
  ];

  const { data: issueTypeData } = useIssueTypes(workloadValue);

  // Reset selected issue types when workload changes by tracking workload
  const [lastWorkload, setLastWorkload] = useState<string | undefined>(workloadValue);
  if (lastWorkload !== workloadValue) {
    setLastWorkload(workloadValue);
    setIssueTypes([]);
  }

  const issueTypeOptions = useMemo(() => {
    if (!issueTypeData) return [];
    return issueTypeData.map((type) => ({ value: type, label: type }));
  }, [issueTypeData]);

  const request = useMemo(
    () => ({
      workload: workloadValue,
      startDate: startDate?.toISOString().split("T")[0] ?? "",
      issueTypes: issueTypes.length > 0 ? issueTypes : undefined,
    }),
    [workloadValue, startDate, issueTypes]
  );

  const { data, isError, error, isFetching, refetch } = useCodeHotspots(request, shouldFetch && !!workloadValue);

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

  const hasData = data && data.length > 0;

  const getFileName = (path: string): string => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

  const getTreemapSeries = (culprit: RepoData) => [
    {
      name: culprit.componentName,
      data: culprit.pathData.map((item) => ({
        x: getFileName(item.path),
        y: item.count,
        meta: {
          fullPath: item.path,
          coverage: item.coverage,
          issueIds: item.issueIds,
          issueLinks: item.issueLinks,
        },
      })),
    },
  ];

  const calculateHeatmapHeight = (itemCount: number): number => {
    const minHeight = 300;
    const maxHeight = 600;
    const heightPerItem = 40;
    return Math.min(maxHeight, Math.max(minHeight, itemCount * heightPerItem));
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:codeHotspots.title")}</CardTitle>
        <CardDescription>{t("components:codeHotspots.description")}</CardDescription>
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
              {t("components:codeHotspots.noHotspotsFor", { workload: workloadValue?.toLocaleUpperCase() })}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <WorkloadNames
              defaults={workloadValue ? [workloadValue] : []}
              multiSelect={false}
              onChange={handleWorkloadChange}
              disabled={isFetching}
            />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              label={t("components:filters.startDate")}
              disabled={isFetching}
            />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <Combobox
              value={issueTypes}
              options={issueTypeOptions}
              label={t("components:filters.issueTypes")}
              onChange={(v) => setIssueTypes(Array.isArray(v) ? v : v ? [v] : [])}
              disabled={isFetching || !workloadValue}
              multiple
            />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="space-y-1">
              <Label>{t("components:codeHotspots.view")}</Label>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as "table" | "heatmap")}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="heatmap"
                  disabled={!hasData}
                  aria-label={t("components:codeHotspots.heatmapView")}
                >
                  <LayoutGrid className="mr-1 h-4 w-4" />
                  {t("components:codeHotspots.heatmap")}
                </ToggleGroupItem>
                <ToggleGroupItem value="table" disabled={!hasData} aria-label={t("components:codeHotspots.tableView")}>
                  <TableIcon className="mr-1 h-4 w-4" />
                  {t("components:codeHotspots.table")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </CardContent>

      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t("components:codeHotspots.analysisInfo")}</AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter>
        <Button variant="default" disabled={!workloadValue || isFetching} onClick={handleRunAnalysis}>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFetching ? t("components:codeHotspots.analysing") : t("components:codeHotspots.runAnalysis")}
        </Button>
      </CardFooter>

      {/* Loading skeleton for results */}
      {isFetching && (
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-1/4" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </div>
          ))}
        </CardContent>
      )}

      {hasData && !isFetching && (
        <>
          {/* Understanding the results panel */}
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="understanding">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t("components:codeHotspots.understandingResults")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <p className="mb-4">
                    <strong>{t("components:codeHotspots.issueRelatedChangesTitle")}</strong>{" "}
                    {t("components:codeHotspots.issueRelatedChangesDescription")}
                  </p>
                  <p className="mb-4">
                    <strong>{t("components:codeHotspots.testCoverageTitle")}</strong>{" "}
                    {t("components:codeHotspots.testCoverageDescription")}
                  </p>
                  <p>
                    <strong>{t("components:codeHotspots.ticketsTitle")}</strong>{" "}
                    {t("components:codeHotspots.ticketsDescription")}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>

          <CardContent>
            {data.map((culprit: RepoData, index: number) => (
              <section key={index} className="mb-6">
                <h4 className="mb-2 text-lg font-semibold">
                  {t("components:codeHotspots.analysisOf", { component: culprit.componentName })}
                  <span className="text-muted-foreground ml-2 text-sm">({culprit.repoName})</span>
                </h4>

                {culprit.pathData.length > 0 ? (
                  viewMode === "table" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHead key={header.key}>{header.title}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {culprit.pathData.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            <TableCell className="font-mono text-sm">{row.path}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell>
                              {row.issueLinks?.map((link, linkIndex) => (
                                <span key={link.id}>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {link.id}
                                  </a>
                                  {linkIndex < row.issueLinks.length - 1 && ", "}
                                </span>
                              ))}
                            </TableCell>
                            <TableCell>{row.coverage ?? t("components:codeHotspots.notAvailable")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <TreemapChart
                      series={getTreemapSeries(culprit)}
                      height={calculateHeatmapHeight(culprit.pathData.length)}
                    />
                  )
                ) : (
                  <p className="text-muted-foreground">{t("components:codeHotspots.noHotspots")}</p>
                )}
              </section>
            ))}
          </CardContent>
        </>
      )}
    </Card>
  );
}
