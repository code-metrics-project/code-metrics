import { Octokit } from "@octokit/rest";
import { uniq } from "lodash/fp";
import { registerVcs, registerVcsConnectionChecker, VcsService } from "./vcsService";
import {
  FileChanges,
  PREvent,
  PullRequest,
  RepoChange,
  RepoChangeSummary,
  CompletePrInfo,
  PrFileChangeItem,
  PREventDetail,
  CommitFileChanges,
} from "../../model/vcs";
import { DatedMetricEntry } from "../../model/metrics";
import { getAllCodeManagementConfig, getAllCodeManagementUrls, getWorkloadById } from "../../config/configMapping";
import { logger, verbose, warn, error } from "../../utils/logger/logger";
import { AuthMethod, CodeManagementServer, RemoteServer } from "../../model/config/remote-config";
import { createGitHubAppOctokit } from "../auth/github-app";
import { MILLIS_PER_DAY, truncateDateOnly } from "../../utils/date";
import { provideDatastore } from "../../db/factory";
import { StorableLike, getDataForDateRange } from "../dateWalker";
import { WorkloadId } from "../../model/config/workload-config";
import { CodeManagementTypes } from "../../model/config/common";
import { getEnvConfigItemAsNumber } from "../../config/sources/source";
import { TMergeRules } from "../../model/qualityGates";
import { ConnectionCheckResult } from "../../model/remote-connection-status";

const COLLECTION_NAME_REPO_COMMITS = "repo-commits";
const COLLECTION_NAME_REPO_CHANGES = "repo-changes";
const EXPIRY_SECONDS = getEnvConfigItemAsNumber("EXPIRY_SECONDS", 3600);

type GithubItemFilter = {
  projectName: string;
  repositoryName: string;
  branch: string;
};

type ChangesQueryResult = StorableLike & GithubItemFilter & { changes: RepoChange[] };

type repoTypes = "all" | "public" | "private" | "forks" | "sources" | "member";

/**
 * Check connectivity to a GitHub server by calling the rate limit endpoint.
 */
const checkGithubConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const codeManagementServer = server as CodeManagementServer;
  const url = codeManagementServer.url || "https://api.github.com";

  try {
    // Create an Octokit instance with the server's credentials
    let octokit: Octokit;
    if (codeManagementServer.authMethod === AuthMethod.GITHUB_APP && codeManagementServer.githubApp) {
      octokit = createGitHubAppOctokit(codeManagementServer.githubApp, url);
    } else {
      octokit = new Octokit({
        auth: codeManagementServer.apiKey,
        baseUrl: url,
        request: { timeout: 5000 }, // 5 second timeout
      });
    }

    // Call the rate limit endpoint as a lightweight health check
    const rateLimitResponse = await octokit.rest.rateLimit.get();

    // Check if rate limit has been reached
    const coreRateLimit = rateLimitResponse.data.resources.core;
    if (coreRateLimit.remaining === 0) {
      const resetDate = new Date(coreRateLimit.reset * 1000);
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.GITHUB,
        url,
        status: "rateLimited",
        statusDetail: `Rate limit reached (${coreRateLimit.limit} requests). Resets at ${resetDate.toISOString()}`,
        responseTimeMs: Date.now() - startTime,
      };
    }

    return {
      id: server.id,
      category: "codeManagement",
      type: CodeManagementTypes.GITHUB,
      url,
      status: "connected",
      responseTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;

    // Classify the error
    // GitHub returns 403 for both auth errors and rate limit errors
    if (err.status === 403 && err.message && err.message.toLowerCase().includes("rate limit")) {
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.GITHUB,
        url,
        status: "rateLimited",
        statusDetail: `HTTP 403: ${err.message}`,
        responseTimeMs,
      };
    }

    if (err.status === 401 || err.status === 403) {
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.GITHUB,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${err.status}: ${err.message}`,
        responseTimeMs,
      };
    }

    if (err.status && err.status >= 400) {
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.GITHUB,
        url,
        status: "error",
        statusDetail: `HTTP ${err.status}: ${err.message}`,
        responseTimeMs,
      };
    }

    // Network errors (ECONNREFUSED, ETIMEDOUT, DNS failures, etc.)
    return {
      id: server.id,
      category: "codeManagement",
      type: CodeManagementTypes.GITHUB,
      url,
      status: "unreachable",
      statusDetail: err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initGithubVcs = () => {
  registerVcs(CodeManagementTypes.GITHUB, () => new GithubVcsService());
  registerVcsConnectionChecker(CodeManagementTypes.GITHUB, checkGithubConnection);
};

/**
 * Finds the PR that was merged earliest.
 * @param pulls
 */
const getFirstMergedPr = (pulls: { merged_at?: string }[]) => {
  let pull;
  if (pulls.length > 0) {
    pulls = pulls.filter((p) => p.merged_at);
    pulls.sort((a, b) => new Date(a.merged_at).getTime() - new Date(b.merged_at).getTime());
    pull = pulls[0];
  }
  return pull;
};

const listPullRequestFiles = async (
  connection: Octokit,
  vcsProjectName: string,
  repositoryName: string,
  pullRequestId: number,
): Promise<PrFileChangeItem[]> => {
  const files = await connection.paginate(connection.rest.pulls.listFiles, {
    owner: vcsProjectName,
    repo: repositoryName,
    pull_number: pullRequestId,
    per_page: 100,
  });
  logger(`Found ${files.length} files on PR ${pullRequestId}`);
  return files.map((file) => {
    const path = file.filename.startsWith("/") ? file.filename : `/${file.filename}`;
    return { path };
  });
};

class GithubVcsService implements VcsService {
  private datastore = provideDatastore("github-vcs", { ttlIfToday: EXPIRY_SECONDS });
  private connections = new Map<WorkloadId, Octokit>();

  #getConnection(workloadId: WorkloadId) {
    let connection = this.connections.get(workloadId);
    if (!connection) {
      const workload = getWorkloadById(workloadId);
      const serverId = workload.codeManagement.serverId;
      const server = getAllCodeManagementConfig().github.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No GitHub server configuration found named: ${serverId}`);
      }
      // Support both GitHub App and Personal Access Token authentication
      if (server.authMethod === AuthMethod.GITHUB_APP && server.githubApp) {
        // Use GitHub App authentication
        connection = createGitHubAppOctokit(server.githubApp, server.url);
      } else {
        // Use Personal Access Token authentication (default)
        connection = new Octokit({
          auth: server.apiKey,
          baseUrl: server.url,
        });
      }
      this.connections.set(workloadId, connection);
    }
    return connection;
  }

  async #getDefaultBranch(workloadId: WorkloadId, vcsProjectName: string, repoName: string) {
    try {
      const connection = this.#getConnection(workloadId);
      const repo = await connection.rest.repos.get({
        owner: vcsProjectName,
        repo: repoName,
      });
      return repo.data.default_branch;
    } catch (e) {
      warn(`Failed to fetch default branch for repo "${repoName}". ${e}.`);
      return null;
    }
  }

  async fetchChangesInDateRange(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]> {
    const connection = this.#getConnection(workloadId);

    const changes = [];
    for (const branch of branches) {
      const filter: GithubItemFilter = { projectName: vcsProjectName, repositoryName, branch };

      const branchChanges = await getDataForDateRange(
        COLLECTION_NAME_REPO_COMMITS,
        filter,
        new Date(start),
        new Date(end),
        this.datastore,
        async (current) => {
          return this.#fetchChangesForDate(connection, workloadId, vcsProjectName, repositoryName, branch, current);
        },
      );
      changes.push(...branchChanges.flatMap((c) => c.changes));
    }
    return changes;
  }

  async summariseChangesInDateRange(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]> {
    const connection = this.#getConnection(workloadId);

    const changes = [];
    for (const branch of branches) {
      const filter: GithubItemFilter = { projectName: vcsProjectName, repositoryName, branch };

      const summaries = await getDataForDateRange(
        COLLECTION_NAME_REPO_CHANGES,
        filter,
        new Date(start),
        new Date(end),
        this.datastore,
        async (current) => {
          return this.#summariseChangesForDate(connection, vcsProjectName, repositoryName, current, branch);
        },
      );
      changes.push(
        ...summaries.map((summary) => {
          const entry: DatedMetricEntry<RepoChangeSummary> = {
            date: summary.date,
            value: summary,
          };
          return entry;
        }),
      );
    }
    return changes;
  }

  async #fetchChangesForDate(
    connection: Octokit,
    workloadId: string,
    vcsProjectName: string,
    repositoryName: string,
    branch: string,
    date: Date,
  ): Promise<ChangesQueryResult> {
    try {
      logger(`Fetching changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
      const commits = await this.#fetchCommits(date, connection, vcsProjectName, repositoryName, branch);

      const changes: RepoChange[] = [];
      for (const commit of commits) {
        const commitDate = commit.commit.committer?.date;
        if (!commitDate) {
          warn(`No committer date for commit: ${commit.sha}`);
          continue;
        }

        changes.push({
          // keep full date/time
          date: commitDate,
          workload: workloadId,
          repo: repositoryName,
          branch,
          commitId: commit.sha,
          message: commit.commit.message,
        });
      }

      return {
        date: truncateDateOnly(date),
        projectName: vcsProjectName,
        repositoryName,
        branch,
        changes,
      };
    } catch (err) {
      throw new Error(
        `Failed to fetch ${vcsProjectName}/${repositoryName}/${branch} changes on ${date} - error: ${err}`,
      );
    }
  }

  async #summariseChangesForDate(
    connection: Octokit,
    vcsProjectName: string,
    repositoryName: string,
    date: Date,
    branch: string,
  ): Promise<RepoChangeSummary> {
    try {
      logger(`Summarising changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
      const commits = await this.#fetchCommits(date, connection, vcsProjectName, repositoryName, branch);

      const changes: FileChanges[] = [];
      const commitIds: string[] = [];
      for (const commit of commits) {
        const detail = await connection.repos.getCommit({
          owner: vcsProjectName,
          repo: repositoryName,
          ref: commit.sha,
        });
        const commitDate = commit.commit.committer?.date;
        if (!commitDate) {
          warn(`No committer date for commit: ${commit.sha}`);
          continue;
        }

        changes.push({
          added: detail.data.stats.additions,
          edited: 0 /* there's not an 'edited' field in the API */,
          deleted: detail.data.stats.deletions,
        });

        commitIds.push(commit.sha);
      }
      const summary: RepoChangeSummary = {
        changes,
        date: truncateDateOnly(date),
        commits: commitIds,
        projectName: vcsProjectName,
        repositoryName,
        branch,
      };
      return summary;
    } catch (err) {
      throw new Error(
        `Failed to summarise ${vcsProjectName}/${repositoryName}/${branch} changes on ${date} - error: ${err}`,
      );
    }
  }

  async #fetchCommits(date: Date, connection: Octokit, vcsProjectName: string, repositoryName: string, branch: string) {
    try {
      const toDate = new Date(date.getTime() + MILLIS_PER_DAY);

      const commits = await connection.paginate(connection.repos.listCommits, {
        owner: vcsProjectName,
        repo: repositoryName,
        // the sha field is used to filter by branch
        sha: branch,
        since: date.toISOString(),
        until: toDate.toISOString(),
        per_page: 100,
      });

      logger(`${commits.length} commits in repo: ${repositoryName}`);
      return commits;
    } catch (e) {
      warn(`Failed to fetch commits for ${vcsProjectName}/${repositoryName}/${branch} - returning empty: ${e.message}`);
      verbose(e);
      return [];
    }
  }

  async #listClosedPRs(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ) {
    const connection = this.#getConnection(workloadId);
    let prs = [];
    try {
      const resp = await connection.paginate(connection.rest.pulls.list, {
        owner: vcsProjectName,
        repo: repositoryName,
        state: "closed",
        sort: "created",
        direction: "asc",
        per_page: 100,
      });
      prs.push(
        ...resp.filter(({ closed_at }) => {
          const completedDate = new Date(closed_at);
          return completedDate >= startDate && completedDate <= endDate;
        }),
      );
      prs = prs.length > limit ? prs.slice(0, limit) : prs;
    } catch (err) {
      warn(`Error retrieving list of PRs: ${err}`);
    }
    return prs;
  }

  async getPROpenTimeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREvent[]> {
    try {
      const prs = await this.#listClosedPRs(workloadId, vcsProjectName, repositoryName, startDate, endDate, limit);
      return prs.reduce((acc, pr) => {
        const existing = acc.find((a) => a.repositoryName === repositoryName);
        const newValue = {
          date: truncateDateOnly(new Date(pr.closed_at)),
          created: pr.created_at,
          untilReview: null,
          untilApproval: null,
          untilCompletion: new Date(pr.closed_at).getTime() - new Date(pr.created_at).getTime(),
        };
        if (!existing) {
          acc.push({
            workloadId,
            projectName: vcsProjectName,
            repositoryName,
            changes: [newValue],
          });
        } else {
          existing.changes.push(newValue);
        }
        return acc;
      }, []);
    } catch (err) {
      throw new Error(`Github.getPROpenTimeFromRepo processing error ${err}`);
    }
  }

  async getPRSizeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREventDetail[]> {
    try {
      const prs = await this.#listClosedPRs(workloadId, vcsProjectName, repositoryName, startDate, endDate, limit);
      if (!prs.length) return [];
      const connection = this.#getConnection(workloadId);
      const detailedPRs = await Promise.all(
        prs.map(
          async (pr) =>
            (
              await connection.rest.pulls.get({
                owner: vcsProjectName,
                repo: repositoryName,
                pull_number: pr.number,
              })
            ).data,
        ),
      );
      return detailedPRs.reduce((acc, pr) => {
        const existing = acc.find((a) => a.repositoryName === repositoryName);
        const newValue = {
          additions: pr.additions,
          changedFiles: pr.changed_files,
          commits: pr.commits,
          date: truncateDateOnly(new Date(pr.closed_at)),
          deletions: pr.deletions,
        };
        if (!existing) {
          acc.push({
            workloadId,
            projectName: vcsProjectName,
            repositoryName,
            changes: [newValue],
          });
        } else {
          existing.changes.push(newValue);
        }
        return acc;
      }, []);
    } catch (err) {
      throw new Error(`Github.getPRSizeFromRepo processing error ${err}`);
    }
  }

  async getPRsForIssuesFromRepository(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    issueIds: string[],
    limit = 1000,
  ): Promise<CompletePrInfo[]> {
    try {
      const connection = this.#getConnection(workloadId);
      let prs: CompletePrInfo[] = [];
      try {
        const resp = await connection.paginate(connection.rest.pulls.list, {
          owner: vcsProjectName,
          repo: repositoryName,
          state: "all",
          per_page: 100,
        });

        const relevantPrs: { issueId: string; pr: { number: number; title: string } }[] = [];
        resp
          .filter(({ title }) => title)
          .forEach((pr) => {
            for (const issueId of issueIds) {
              if (pr.title.match(new RegExp(`${issueId}[^\\d]`, "g"))) {
                relevantPrs.push({ issueId: issueId, pr });
                break;
              }
            }
          });

        for (const relevantPr of relevantPrs) {
          const complete: CompletePrInfo = {
            pr: {
              id: relevantPr.pr.number,
              title: relevantPr.pr.title,
              workloadId,
              vcsProjectName,
              repositoryName,
            },
            issueId: relevantPr.issueId,
            filesChanged: [],
          };
          prs.push(complete);
        }
      } catch (err) {
        warn(`Error retrieving github data: ${err}`);
      }
      prs = prs.length > limit ? prs.slice(0, limit) : prs;

      // find changed files
      for (const pr of prs) {
        pr.filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, pr.pr.id);
      }

      logger(`Retrieved ${prs.length} total (limit: ${limit}) PRs for issueIds: ${issueIds}`);
      return prs;
    } catch (err) {
      throw new Error(`Github error ${err}`);
    }
  }

  getPRsInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<CompletePrInfo[]> => {
    try {
      const connection = this.#getConnection(workloadId);
      const prs = await this.#listClosedPRs(workloadId, vcsProjectName, repositoryName, startDate, endDate, limit);

      const completePrs: CompletePrInfo[] = await Promise.all(
        prs.map(async (pr) => {
          const filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, pr.number);
          return {
            pr: {
              id: pr.number,
              title: pr.title,
              workloadId,
              vcsProjectName,
              repositoryName,
            },
            issueId: "",
            filesChanged,
          };
        }),
      );

      return completePrs;
    } catch (err) {
      throw new Error(`Github.getPRsInDateRange error ${err}`);
    }
  };

  getCommitFileChanges = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<CommitFileChanges[]> => {
    const connection = this.#getConnection(workloadId);
    const allCommitChanges: CommitFileChanges[] = [];
    const processedCommits = new Set<string>();

    for (const branch of branches) {
      try {
        const commits = await connection.paginate(connection.rest.repos.listCommits, {
          owner: vcsProjectName,
          repo: repositoryName,
          sha: branch,
          since: new Date(start).toISOString(),
          until: new Date(end).toISOString(),
          per_page: 100,
        });

        for (const commit of commits) {
          if (processedCommits.has(commit.sha)) continue;
          processedCommits.add(commit.sha);

          const detail = await connection.rest.repos.getCommit({
            owner: vcsProjectName,
            repo: repositoryName,
            ref: commit.sha,
          });

          const filePaths = detail.data.files?.map((f) => f.filename) || [];

          allCommitChanges.push({
            commitId: commit.sha,
            filePaths,
          });
        }
      } catch (err) {
        warn(`Failed to fetch commits for ${vcsProjectName}/${repositoryName}/${branch}: ${err}`);
      }
    }

    return allCommitChanges;
  };

  /**
   * Check if the connection is using GitHub App authentication
   */
  async #isGitHubApp(connection: Octokit): Promise<boolean> {
    try {
      // Try to call an app-specific endpoint
      await connection.apps.getAuthenticated();
      return true;
    } catch (e) {
      // If this fails, it's likely a PAT
      return false;
    }
  }

  async getReposForProject(workloadId: WorkloadId, vcsProject: string): Promise<string[]> {
    const connection = this.#getConnection(workloadId);

    // Check if this is a GitHub App by trying to get installation info
    const isGitHubApp = await this.#isGitHubApp(connection);

    const allRepos = await (async (repoType: repoTypes = "all") => {
      try {
        let resp: { name }[];

        if (isGitHubApp) {
          // For GitHub Apps, use listReposAccessibleToInstallation with pagination
          const allInstallationRepos = await connection.paginate(connection.apps.listReposAccessibleToInstallation, {
            per_page: 100,
          });
          // Filter by organization and extract repository names
          resp = allInstallationRepos
            .filter((repo) => repo.owner.login === vcsProject)
            .map((repo) => ({ name: repo.name }));
        } else {
          // For PATs, use the original listForOrg method
          resp = await connection.paginate(connection.repos.listForOrg, {
            org: vcsProject,
            type: repoType,
            per_page: 100,
          });
        }

        return uniq(resp.map((repo) => repo.name)) as string[];
      } catch (e) {
        warn(`Failed to list '${repoType}' repos for '${vcsProject}' - returning empty list: ${e.message}`);
        verbose(e);
        return [];
      }
    })();

    logger(`Retrieved ${allRepos.length} repos total for github org: '${vcsProject}'`);
    return allRepos;
  }

  async getPRForCommit(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    commitId: string,
  ): Promise<PullRequest | null> {
    try {
      const connection = this.#getConnection(workloadId);
      const pulls = await connection.paginate(connection.repos.listPullRequestsAssociatedWithCommit, {
        owner: vcsProjectName,
        repo: repositoryName,
        commit_sha: commitId,
      });
      const pull = getFirstMergedPr(pulls);
      if (pull) {
        return {
          id: pull.number,
          workloadId,
          vcsProjectName,
          repositoryName,
          sourceBranch: pull.head?.ref,
          title: pull.title,
          message: pull.body,
        };
      }
      return null;
    } catch (e) {
      warn(`Failed to get PR from commit ${commitId} in ${vcsProjectName}/${repositoryName}`, e);
      return null;
    }
  }

  getEarliestCommitForPr = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    pullRequestId: number,
  ): Promise<RepoChange> => {
    const connection = this.#getConnection(workloadId);
    const commits = await connection.paginate(connection.pulls.listCommits, {
      owner: vcsProjectName,
      repo: repositoryName,
      pull_number: pullRequestId,
    });
    if (commits.length === 0) {
      throw new Error(`No commits found for PR ${pullRequestId} for workload ${workloadId} in repo ${repositoryName}`);
    }
    let earliestCommit = commits[0];
    for (const commit of commits) {
      if (commit.commit.committer.date < earliestCommit.commit.committer.date) {
        earliestCommit = commit;
      }
    }
    logger(
      `Earliest commit for PR ${pullRequestId} for workload ${workloadId} in repo ${repositoryName} is ${earliestCommit.sha} on ${earliestCommit.commit.committer.date}`,
    );
    return <RepoChange>{
      date: earliestCommit.commit.committer.date,
      workload: workloadId,
      repo: repositoryName,
      branch: earliestCommit.commit.tree.sha,
      commitId: earliestCommit.sha,
      message: earliestCommit.commit.message,
    };
  };

  fetchFile = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
    path: string,
  ): Promise<string | null> => {
    try {
      const connection = this.#getConnection(workloadId);
      const response = await connection.rest.repos.getContent({
        owner: vcsProjectName,
        repo: repoName,
        path,
        headers: {
          Accept: "application/vnd.github.raw+json",
        },
      });

      if (response?.data) {
        // coerce because we set the Accept header to get raw content
        return response.data as unknown as string;
      } else {
        error("File not found or content not available.");
        return null;
      }
    } catch (e) {
      if (e.status === 404) {
        verbose(`No quality gate manifest found for '${repoName}'.`);
      } else {
        error("Error fetching file from GitHub:", e);
      }
      return null;
    }
  };

  #getBranchProtectionRules = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
    branch: string,
  ) => {
    try {
      const connection = this.#getConnection(workloadId);
      const result = await connection.rest.repos.getBranchProtection({
        owner: vcsProjectName,
        repo: repoName,
        branch,
      });
      return result.data;
    } catch (e) {
      error(e);
      return;
    }
  };

  #getRulesets = async (workloadId: WorkloadId, vcsProjectName: string, repoName: string, branch: string) => {
    try {
      const connection = this.#getConnection(workloadId);
      const allRulesetsResponse = await connection.rest.repos.getRepoRulesets({
        owner: vcsProjectName,
        repo: repoName,
        branch,
      });
      const allRulesetIds = allRulesetsResponse.data.map((ruleset) => ruleset.id);
      const allRulesets = await Promise.all(
        allRulesetIds.map(async (rulesetId) => {
          const ruleset = await connection.rest.repos.getRepoRuleset({
            owner: vcsProjectName,
            repo: repoName,
            ruleset_id: rulesetId,
          });
          return ruleset.data;
        }),
      );
      return allRulesets;
    } catch (e) {
      error(e);
      return [];
    }
  };

  fetchMergeRules = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
  ): Promise<TMergeRules[] | null> => {
    const branch = await this.#getDefaultBranch(workloadId, vcsProjectName, repoName);
    if (!branch) return null;

    const [branchProtectionRules, rulesets] = await Promise.all([
      this.#getBranchProtectionRules(workloadId, vcsProjectName, repoName, branch),
      this.#getRulesets(workloadId, vcsProjectName, repoName, branch),
    ]);
    const mergeRules: TMergeRules[] = [
      ...(branchProtectionRules && branchProtectionRules.required_status_checks
        ? branchProtectionRules.required_status_checks.checks.map((bpr) => ({ name: bpr.context, id: bpr.app_id }))
        : []),
      ...rulesets
        .map((ruleset) => {
          const requiredStatusChecks = ruleset.rules.filter((rule) => rule.type === "required_status_checks");
          return requiredStatusChecks
            .map((rsc) => {
              return rsc.parameters.required_status_checks.map((r) => ({
                name: r.context,
                id: r.integration_id,
              }));
            })
            .flat();
        })
        .flat(),
    ];
    return mergeRules;
  };

  buildCommitLink = (change: RepoChange, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/commit/${change.commitId}`;

  buildPRLink = (change: RepoChange, pr: PullRequest, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/pull/${pr.id}`;

  buildRepoLink = (workloadId: WorkloadId, repoName: string): string =>
    `${getAllCodeManagementUrls()[workloadId]}/${repoName}`;

  buildFileLink = (workloadId: WorkloadId, repoName: string, branch: string, path: string): string =>
    `${this.buildRepoLink(workloadId, repoName)}/blob/${branch}/${path}`;
}
