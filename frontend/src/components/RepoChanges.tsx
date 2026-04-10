import { useState, useMemo, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Loader2,
  Bug,
  Ticket,
  HelpCircle,
  GitPullRequest,
  Code,
  ExternalLink,
  ArrowUpDown,
  Lightbulb,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkloadNames } from "@/components/inputs/WorkloadNames";
import { RepoGroups } from "@/components/inputs/RepoGroups";
import { DatePicker } from "@/components/inputs/DatePicker";
import { getRelativeDate, walkDateRangeBatched } from "@/utils/date";
import { logger } from "@/utils/logger";
import { type ChangeRow, fetchForDateRange } from "@/services/changes";
import { useI18n } from "@/hooks/useI18n";
import { getConfig } from "@/config";
import { createChangesSummaryQueryOptions } from "@/queries/useChangesSummary";

const API_BATCH_DAYS = 7;

interface RepoChangeSummary {
  total: number;
  bugs: number;
  tasks: number;
  prs: number;
  bareCommits: number;
}

export interface RepoChangesProps {
  workload?: string;
  executeOnMount?: boolean;
}

export function RepoChanges({ workload, executeOnMount = false }: RepoChangesProps) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [rawChanges, setRawChanges] = useState<ChangeRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [search, setSearch] = useState("");
  const [groupTickets, setGroupTickets] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => getRelativeDate(new Date(), -7));
  const [endDate, setEndDate] = useState<Date>(() => getRelativeDate(new Date(), 0));
  const [workloads, setWorkloads] = useState<string[]>(workload ? [workload] : []);
  const [repoGroups, setRepoGroups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<RepoChangeSummary | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredChanges = useMemo(() => {
    if (!search) return changes;
    const searchLower = search.toLowerCase();
    return changes.filter(
      (c) =>
        c.workload?.toLowerCase().includes(searchLower) ||
        c.id?.toLowerCase().includes(searchLower) ||
        c.title?.toLowerCase().includes(searchLower) ||
        c.repo?.toLowerCase().includes(searchLower)
    );
  }, [search, changes]);

  const sortedChanges = useMemo(() => {
    if (!sorting) return filteredChanges;

    const sorted = [...filteredChanges];
    sorted.sort((a, b) => {
      let aVal: string | number = a[sorting.column as keyof ChangeRow] as string | number;
      let bVal: string | number = b[sorting.column as keyof ChangeRow] as string | number;

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sorting.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredChanges, sorting]);

  const paginatedChanges = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedChanges.slice(start, start + pageSize);
  }, [sortedChanges, pageIndex, pageSize]);

  const fetchAISummary = useCallback(async (forceRegenerate = false): Promise<void> => {
    const config = getConfig();
    if (!config?.systemConfig?.llmEnabled) {
      return;
    }

    try {
      setAiSummaryLoading(true);
      setAiSummaryError(null);

      const summaryQueryOptions = createChangesSummaryQueryOptions({
        workloads,
        repoGroups,
        startDate,
        endDate,
        language: locale,
      });

      const summaryResponse = forceRegenerate
        ? await queryClient.fetchQuery({ ...summaryQueryOptions, staleTime: 0 })
        : await queryClient.fetchQuery(summaryQueryOptions);
      if (summaryResponse.code === "NO_CHANGES") {
        setAiSummary(t("components:repoChanges.aiSummaryNoChanges"));
      } else {
        setAiSummary(summaryResponse.summary);
      }
    } catch (error) {
      logger("Failed to fetch AI summary", error);
      setAiSummaryError(t("components:repoChanges.aiSummaryError"));
    } finally {
      setAiSummaryLoading(false);
    }
  }, [workloads, repoGroups, startDate, endDate, locale, t, queryClient]);

  useEffect(() => {
    const grouped = groupTickets ? groupByTicket(rawChanges) : rawChanges;
    setChanges(grouped);
    setSummary(summarise(grouped));
  }, [groupTickets, rawChanges]);

  useEffect(() => {
    let isMounted = true;

    if (executeOnMount) {
      // Use the async function with mounted check
      (async () => {
        try {
          setBusy(true);
          setProgress(0);
          setRawChanges([]);
          setChanges([]);
          setSummary(null);
          setAiSummary("");
          setAiSummaryError(null);

          const accumulated: ChangeRow[] = [];

          await walkDateRangeBatched(startDate, endDate, API_BATCH_DAYS, async (batch: Date[], prog: number) => {
            if (!isMounted) return;

            const firstDate = batch[0];
            const lastDate = batch[batch.length - 1];
            const changesData = await fetchForDateRange(workloads, repoGroups, firstDate, lastDate);

            if (!isMounted) return;

            // append and refresh UI
            accumulated.push(...changesData);
            setRawChanges([...accumulated]);

            const grouped = groupTickets ? groupByTicket(accumulated) : accumulated;
            setChanges(grouped);
            setSummary(summarise(grouped));
            setProgress(prog);
          });

          if (isMounted) {
            await fetchAISummary();
          }

          if (isMounted) {
            setBusy(false);
          }
        } catch (err) {
          if (isMounted) {
            console.error("[RepoChanges] Failed to fetch changes:", err);
            setBusy(false);
          }
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [executeOnMount, startDate, endDate, workloads, repoGroups, groupTickets, fetchAISummary]);

  function summarise(changesData: ChangeRow[]): RepoChangeSummary {
    return {
      bugs: changesData.filter((c) => c.type === "Bug").length,
      tasks: changesData.filter((c) => c.type !== "Bug" && c.type !== "PR" && c.type !== "Commit").length,
      prs: changesData.filter((c) => c.type === "PR").length,
      bareCommits: changesData.filter((c) => c.type === "Commit").length,
      total: changesData.length,
    };
  }

  async function fetchChanges(): Promise<void> {
    try {
      setBusy(true);
      setProgress(0);
      setRawChanges([]);
      setChanges([]);
      setSummary(null);
      setAiSummary("");
      setAiSummaryError(null);

      const accumulated: ChangeRow[] = [];

      await walkDateRangeBatched(startDate, endDate, API_BATCH_DAYS, async (batch: Date[], prog: number) => {
        const firstDate = batch[0];
        const lastDate = batch[batch.length - 1];
        const changesData = await fetchForDateRange(workloads, repoGroups, firstDate, lastDate);

        // append and refresh UI
        accumulated.push(...changesData);
        setRawChanges([...accumulated]);

        const grouped = groupTickets ? groupByTicket(accumulated) : accumulated;
        setChanges(grouped);
        setSummary(summarise(grouped));
        setProgress(prog * 100);
      });

      await fetchAISummary();
    } finally {
      setBusy(false);
    }
  }

  function groupByTicket(changesData: ChangeRow[]): ChangeRow[] {
    const groupedRows: ChangeRow[] = [];

    const groups: Record<string, ChangeRow> = {};
    for (const change of changesData) {
      if (!change.id) {
        groupedRows.push(change);
        continue;
      }
      let group = groups[change.id];
      if (!group) {
        // deep clone
        group = {
          ...change,
          commits: [...change.commits],
        };
      } else {
        group.commits.push(...change.commits);
        if (new Date(change.date).getTime() < new Date(group.date).getTime()) {
          group.date = change.date;
        }
        if (change.message) {
          group.message = (group.message ?? "") + " \n" + change.message;
        }
        if (change.title && !group.title?.includes(change.title)) {
          group.title = (group.title ?? "") + " \n" + change.title;
        }
      }
      groups[change.id] = group;
    }
    groupedRows.push(...Object.values(groups));

    logger(`Grouped ${changesData.length} changes into ${groupedRows.length} groups`);
    return groupedRows;
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="border-border/50 border-b pb-4">
        <CardTitle>{t("components:repoChanges.title")}</CardTitle>
        <CardDescription>{t("components:repoChanges.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-9">
            <div className="grid grid-cols-2 gap-4">
              <WorkloadNames
                defaults={workloads}
                onChange={(w) => setWorkloads(Array.isArray(w) ? w : w ? [w] : [])}
                disabled={busy}
              />
              <RepoGroups defaults={repoGroups} onChange={(rg) => setRepoGroups(rg)} disabled={busy} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <DatePicker
                value={startDate}
                onChange={(d) => d && setStartDate(d)}
                label={t("components:filters.startDate")}
                disabled={busy}
              />
              <DatePicker
                value={endDate}
                onChange={(d) => d && setEndDate(d)}
                label={t("components:filters.endDate")}
                disabled={busy}
              />
            </div>
          </div>
          <div className="col-span-3">
            <p className="text-muted-foreground mb-2 text-sm">{t("components:repoChanges.display")}</p>
            <div className="mb-2 flex items-center space-x-2">
              <Checkbox
                id="groupTickets"
                checked={groupTickets}
                onCheckedChange={(checked) => setGroupTickets(checked === true)}
                disabled={busy}
              />
              <Label htmlFor="groupTickets">{t("components:repoChanges.groupTickets")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showMessages"
                checked={showMessages}
                onCheckedChange={(checked) => setShowMessages(checked === true)}
                disabled={busy}
              />
              <Label htmlFor="showMessages">{t("components:repoChanges.showMessages")}</Label>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="default" disabled={busy} onClick={fetchChanges}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("components:repoChanges.showChanges")}
          </Button>
          {busy && <div className="text-muted-foreground text-sm">{Math.round(progress)}%</div>}
        </div>
      </CardContent>

      {(aiSummary || aiSummaryLoading || aiSummaryError) && (
        <CardContent className="pt-0">
          <Card className="bg-accent/40 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="inline-flex items-center">
                  <Lightbulb className="text-primary mr-2 h-4 w-4" />
                  {t("components:repoChanges.aiSummaryTitle")}
                </span>
                <div className="flex items-center gap-2">
                  {rawChanges.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAISummary(true)}
                      disabled={aiSummaryLoading || busy}
                    >
                      {t("components:repoChanges.aiSummaryRegenerate")}
                    </Button>
                  )}
                  {aiSummaryLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {aiSummaryError ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">{aiSummaryError}</p>
              ) : aiSummary ? (
                <p className="text-sm whitespace-pre-line">{aiSummary}</p>
              ) : (
                <p className="text-muted-foreground text-sm">{t("components:repoChanges.aiSummaryLoading")}</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("components:repoChanges.changes")}</span>
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

      {summary && (
        <div className="bg-accent mx-4 mt-3 rounded-lg p-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <p className="text-muted-foreground text-sm font-bold">{t("components:repoChanges.summary")}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="font-medium">
                  {t("components:repoChanges.changesCount", { count: summary.total })}
                </span>
                {groupTickets && <span>{t("components:repoChanges.grouped")}</span>}
                <span className="inline-flex items-center">
                  <Bug className="mr-1 h-4 w-4 text-red-500" />
                  {t("components:repoChanges.bugs")}: {summary.bugs}
                </span>
                <span className="inline-flex items-center">
                  <Ticket className="mr-1 h-4 w-4 text-blue-500" />
                  {t("components:repoChanges.tasks")}: {summary.tasks}
                </span>
                <span className="inline-flex items-center">
                  <HelpCircle className="mr-1 h-4 w-4 text-orange-500" />
                  {t("components:repoChanges.noTicket")}: {summary.prs + summary.bareCommits}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => {
                    const isCurrentSort = sorting?.column === "workload";
                    setSorting(
                      isCurrentSort && sorting?.direction === "asc"
                        ? { column: "workload", direction: "desc" }
                        : { column: "workload", direction: "asc" }
                    );
                    setPageIndex(0);
                  }}
                  className="hover:text-foreground inline-flex items-center gap-1"
                >
                  {t("components:repoChanges.tableHeaders.workload")}
                  {sorting?.column === "workload" && <ArrowUpDown className="h-4 w-4" />}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => {
                    const isCurrentSort = sorting?.column === "id";
                    setSorting(
                      isCurrentSort && sorting?.direction === "asc"
                        ? { column: "id", direction: "desc" }
                        : { column: "id", direction: "asc" }
                    );
                    setPageIndex(0);
                  }}
                  className="hover:text-foreground inline-flex items-center gap-1"
                >
                  {t("components:repoChanges.tableHeaders.ticket")}
                  {sorting?.column === "id" && <ArrowUpDown className="h-4 w-4" />}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => {
                    const isCurrentSort = sorting?.column === "date";
                    setSorting(
                      isCurrentSort && sorting?.direction === "asc"
                        ? { column: "date", direction: "desc" }
                        : { column: "date", direction: "asc" }
                    );
                    setPageIndex(0);
                  }}
                  className="hover:text-foreground inline-flex items-center gap-1"
                >
                  {t("components:repoChanges.tableHeaders.date")}
                  {sorting?.column === "date" && <ArrowUpDown className="h-4 w-4" />}
                </button>
              </TableHead>
              <TableHead>{t("components:repoChanges.tableHeaders.title")}</TableHead>
              <TableHead>
                <button
                  onClick={() => {
                    const isCurrentSort = sorting?.column === "repo";
                    setSorting(
                      isCurrentSort && sorting?.direction === "asc"
                        ? { column: "repo", direction: "desc" }
                        : { column: "repo", direction: "asc" }
                    );
                    setPageIndex(0);
                  }}
                  className="hover:text-foreground inline-flex items-center gap-1"
                >
                  {t("components:repoChanges.tableHeaders.repository")}
                  {sorting?.column === "repo" && <ArrowUpDown className="h-4 w-4" />}
                </button>
              </TableHead>
              <TableHead>{t("components:repoChanges.tableHeaders.commits")}</TableHead>
              {showMessages && <TableHead>{t("components:repoChanges.tableHeaders.message")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedChanges.length > 0 ? (
              paginatedChanges.map((row) => (
                <TableRow key={row.id || Math.random()}>
                  <TableCell>{row.workload}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center whitespace-nowrap">
                      {row.type === "PR" && <GitPullRequest className="mr-1 h-4 w-4 text-green-500" />}
                      {row.type === "Commit" && <Code className="mr-1 h-4 w-4 text-gray-500" />}
                      {row.type === "Bug" && <Bug className="mr-1 h-4 w-4 text-red-500" />}
                      {row.type !== "PR" && row.type !== "Commit" && row.type !== "Bug" && (
                        <Ticket className="mr-1 h-4 w-4 text-blue-500" />
                      )}
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        {row.id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </TableCell>
                  <TableCell>{new Date(row.date).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="whitespace-pre-line">{row.title}</span>
                  </TableCell>
                  <TableCell>{row.repo}</TableCell>
                  <TableCell>
                    <span>
                      {row.commits.map((commit, index) => (
                        <span key={commit.id}>
                          {index > 0 && ", "}
                          <a
                            href={commit.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            {commit.id}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      ))}
                    </span>
                  </TableCell>
                  {showMessages && (
                    <TableCell>
                      <span className="whitespace-pre-line">{row.message}</span>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={showMessages ? 7 : 6} className="text-muted-foreground py-8 text-center">
                  {t("components:repoChanges.noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
              {t("components:repoChanges.pagination.first")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              {t("components:repoChanges.pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={(pageIndex + 1) * pageSize >= sortedChanges.length}
            >
              {t("components:repoChanges.pagination.next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(Math.ceil(sortedChanges.length / pageSize) - 1)}
              disabled={(pageIndex + 1) * pageSize >= sortedChanges.length}
            >
              {t("components:repoChanges.pagination.last")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t("components:repoChanges.pagination.pageOf", {
                current: pageIndex + 1,
                total: Math.max(1, Math.ceil(sortedChanges.length / pageSize)),
              })}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">{t("components:repoChanges.pagination.rowsPerPage")}</span>
          </div>

          <div className="text-muted-foreground text-sm">
            {t("components:repoChanges.pagination.showing", {
              count: paginatedChanges.length,
              total: filteredChanges.length,
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
