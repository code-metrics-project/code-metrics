import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageBreadcrumbs } from "@/components/layout";
import { Search, ExternalLink, Activity, Play } from "lucide-react";
import { Paths } from "@/router/paths";
import { buildPath } from "@/utils/path";
import { getRepositoryDetails, getWorkloadDetail, getWorkloadName } from "@/services/workload";
import { RepoGroups } from "@/components/inputs/RepoGroups";

export default function Repositories() {
  const { t } = useI18n();
  const { workloadId } = useParams<{ workloadId?: string }>();
  const [search, setSearch] = useState("");
  const [selectedRepoGroups, setSelectedRepoGroups] = useState<string[]>([]);

  // Get repositories from config, optionally filtered by workload
  const repositories = useMemo(() => {
    return getRepositoryDetails(workloadId || undefined);
  }, [workloadId]);

  // Apply search and repo group filters
  const filteredRepos = useMemo(() => {
    let results = repositories;
    if (selectedRepoGroups.length > 0) {
      results = results.filter((repo) => repo.repoGroups.some((g) => selectedRepoGroups.includes(g)));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchLower) ||
          repo.workloadName.toLowerCase().includes(searchLower) ||
          repo.repoGroups.some((g) => g.toLowerCase().includes(searchLower))
      );
    }
    return results;
  }, [repositories, search, selectedRepoGroups]);

  // Get workload details for title/description if filtered by workload
  const workloadDetail = useMemo(() => {
    if (!workloadId) return null;
    try {
      return getWorkloadDetail(workloadId);
    } catch {
      return null;
    }
  }, [workloadId]);

  const title = workloadDetail
    ? t("pages:repositories.workloadTitle", { workloadName: workloadDetail.name })
    : t("pages:repositories.allTitle");

  const description = workloadDetail
    ? t("pages:repositories.workloadDescription", { workloadName: workloadDetail.name })
    : t("pages:repositories.allDescription");
  const breadcrumbWorkloadName = workloadId ? (workloadDetail?.name ?? getWorkloadName(workloadId)) : undefined;
  const breadcrumbs = workloadId
    ? [
        { label: t("pages:workloads.title"), to: Paths.Workloads },
        { label: breadcrumbWorkloadName, to: `${Paths.Workloads}/${workloadId}` },
        { label: t("pages:repositories.title") },
      ]
    : [{ label: t("pages:program.title"), to: Paths.Program }, { label: t("pages:repositories.title") }];

  return (
    <div>
      {/* Header with Breadcrumbs */}
      <section className="header-section py-8">
        <div className="relative z-10 container mx-auto px-4">
          <PageBreadcrumbs items={breadcrumbs} />
          <h2 className="mt-2 text-3xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="min-w-56">
            <RepoGroups onChange={setSelectedRepoGroups} />
          </div>
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("pages:repositories.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{t("pages:repositories.found", { count: filteredRepos.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table id="repositories-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pages:repositories.colHeaders.repository")}</TableHead>
                  {!workloadId && <TableHead>{t("pages:repositories.colHeaders.workload")}</TableHead>}
                  <TableHead>{t("pages:repositories.colHeaders.repoGroups")}</TableHead>
                  <TableHead>{t("pages:repositories.colHeaders.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepos.map((repo) => (
                  <TableRow key={repo.name}>
                    <TableCell className="font-medium">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/workload/${repo.workloadId}/repositories/${encodeURIComponent(repo.repoGroups[0] ?? "")}/${encodeURIComponent(repo.name)}`}
                          className="text-primary hover:underline"
                        >
                          {repo.name}
                        </Link>
                        {repo.url && (
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                            aria-label={t("pages:repositories.openInSourceControl")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    {!workloadId && (
                      <TableCell>
                        <Link to={`${Paths.Workloads}/${repo.workloadId}`} className="hover:underline">
                          <Badge variant="outline">{repo.workloadName}</Badge>
                        </Link>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {repo.repoGroups.map((group) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="link" size="sm" asChild className="h-auto p-0">
                          <Link
                            to={buildPath(Paths.WorkloadPipelineHealth, {
                              workloadId: repo.workloadId,
                              executeImmediately: "true",
                              branchName: "main",
                              repoName: repo.name,
                            })}
                          >
                            <Activity className="mr-1 h-4 w-4" />
                            {t("pages:repositories.buttonPipelineHealth")}
                          </Link>
                        </Button>
                        <Button variant="link" size="sm" asChild className="h-auto p-0">
                          <Link
                            to={buildPath(Paths.WorkloadPipelineRuns, {
                              workloadId: repo.workloadId,
                              executeImmediately: "true",
                              branchName: "main",
                              repoName: repo.name,
                            })}
                          >
                            <Play className="mr-1 h-4 w-4" />
                            {t("pages:repositories.buttonPipelineRuns")}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredRepos.length === 0 && (
              <p className="text-muted-foreground mt-4 text-center text-sm">{t("pages:repositories.noRepositories")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
