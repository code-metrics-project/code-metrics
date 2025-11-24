import { WebApi, getPersonalAccessTokenHandler } from "azure-devops-node-api/WebApi";
import { IGitApi } from "azure-devops-node-api/GitApi";
import {
  GitCommitChanges,
  GitPullRequest,
  GitPullRequestQueryType,
  GitVersionType,
  PullRequestStatus,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import { limitConcurrencyAndRetry } from "../../utils/retry";
import { MILLIS_PER_DAY, truncateDateOnly } from "../../utils/date";
import { DatedMetricEntry } from "../../model/metrics";
import { logger, verbose, warn, error } from "../../utils/logger/logger";
import {
  CompletePrInfo,
  FileChanges,
  PrFileChangeItem,
  LightweightPR,
  PREvent,
  PullRequest,
  RepoChange,
  RepoChangeSummary,
  PREventDetail,
} from "../../model/vcs";
import { provideDatastore } from "../../db/factory";
import { getAllCodeManagementUrls, getAllRemoteConfig, getWorkloadById } from "../../config/configMapping";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { registerVcs, VcsService } from "./vcsService";
import { StorableLike, getDataForDateRange } from "../dateWalker";
import { WorkloadId } from "../../model/config/workload-config";
import Bottleneck from "bottleneck";
import { CodeManagementTypes } from "../../model/config/common";
import { TMergeRules } from "../qualityGates/qualityGates";

const REFS_HEADS_STR = "refs/heads/";

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

type AdoItemFilter = {
  projectName: string;
  repositoryName: string;
  branch: string;
};

export const initAdoVcs = () => registerVcs(CodeManagementTypes.AZURE, () => new AdoVcsService());

class AdoVcsService implements VcsService {
  private connections: Map<string, WebApi>;
  private datastore: Datastore<QueryFilter, DatastoreCollection>;

  constructor() {
    this.datastore = provideDatastore("ado-vcs", { ttlIfToday: 3600 });
    this.connections = new Map<string, WebApi>();
  }

  #getConnection = (workloadId: WorkloadId, reset = false): WebApi => {
    let connection: WebApi;
    if (!this.connections.has(workloadId) || reset) {
      const remoteServerId = getWorkloadById(workloadId).codeManagement.serverId;
      const azureServer = getAllRemoteConfig().codeManagement.azure.servers.find(
        (server) => server.id === remoteServerId,
      );

      const authHandler = getPersonalAccessTokenHandler(azureServer.apiKey);
      connection = new WebApi(azureServer.url, authHandler);
      this.connections.set(workloadId, connection);
    } else {
      connection = this.connections.get(workloadId);
    }

    return connection;
  };

  #getCompletePRInformation = async (
    gitApi: IGitApi,
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    relevant: { issueId: string; pr: GitPullRequest },
  ): Promise<CompletePrInfo> => {
    const changes: GitCommitChanges[] = [];
    if (!relevant.pr.pullRequestId) {
      warn("No pullRequestID provided for PR, skipping data fetch");
    } else {
      const commits = await limitConcurrencyAndRetry(limiter, async () =>
        gitApi.getPullRequestCommits(repositoryName, relevant.pr.pullRequestId, vcsProjectName),
      );
      let errorCount = 0;
      for (const { commitId } of commits) {
        if (!commitId) {
          warn("No commitId found for commit, skipping data fetch");
        } else {
          try {
            changes.push(
              await limitConcurrencyAndRetry(limiter, () =>
                gitApi.getChanges(commitId, repositoryName, vcsProjectName),
              ),
            );
          } catch (e) {
            error(e, commitId);
            errorCount++;
          }
        }
      }
      verbose(`${errorCount} errors retrieving changes for ${commits.length} commits`);
    }
    const outputPr: LightweightPR = {
      id: relevant.pr.pullRequestId,
      title: relevant.pr.title,
      workloadId,
      vcsProjectName,
      repositoryName,
      completionOptions: {
        bypassPolicy: relevant.pr.completionOptions?.bypassPolicy,
        bypassReason: relevant.pr.completionOptions?.bypassReason,
      },
    };
    const outputChanges: PrFileChangeItem[] = changes.flatMap((change) => {
      return change.changes.map((c) => ({ path: c.item.path }));
    });
    return {
      pr: outputPr,
      issueId: relevant.issueId,
      filesChanged: outputChanges,
    };
  };

  getPROpenTimeFromRepo = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit = 1000,
  ): Promise<PREvent[]> => {
    try {
      const gitApi = await this.#getConnection(workloadId).getGitApi();
      const prs =
        (await limitConcurrencyAndRetry(limiter, async () =>
          gitApi.getPullRequests(
            repositoryName,
            { status: PullRequestStatus.Completed },
            vcsProjectName,
            undefined,
            undefined,
            limit,
          ),
        )) ?? [];
      const prsInDateRange = prs.filter((pr) => {
        const completedDate = new Date(pr.closedDate);
        return completedDate >= startDate && completedDate <= endDate;
      });
      return prsInDateRange.reduce((acc, pr) => {
        const existing = acc.find((a) => a.repositoryName === repositoryName);
        const newValue = {
          date: truncateDateOnly(new Date(pr.closedDate)),
          created: pr.creationDate,
          untilReview: null,
          untilApproval: null,
          untilCompletion: new Date(pr.closedDate).getTime() - new Date(pr.creationDate).getTime(),
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
      throw new Error(`ADO.getPROpenTimeFromRepo error ${err}`);
    }
  };

  getPRsForIssuesFromRepository = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    issueIds: string[],
    limit = 1000,
  ): Promise<CompletePrInfo[]> => {
    try {
      const gitApi = await this.#getConnection(workloadId).getGitApi();
      const prs =
        (await limitConcurrencyAndRetry(limiter, async () =>
          gitApi.getPullRequests(
            repositoryName,
            { status: PullRequestStatus.All },
            vcsProjectName,
            undefined,
            undefined,
            limit,
          ),
        )) ?? [];

      const relevantPrs: { issueId: string; pr: GitPullRequest }[] = [];
      prs
        .filter(({ title }) => title)
        .forEach((pr) => {
          for (const issueId of issueIds) {
            if (pr.title.match(new RegExp(`${issueId}[^\\d]`, "g"))) {
              relevantPrs.push({ issueId, pr });
              break;
            }
          }
        });
      return await Promise.all(
        relevantPrs.map((relevant) => {
          return this.#getCompletePRInformation(gitApi, workloadId, vcsProjectName, repositoryName, relevant);
        }),
      );
    } catch (err) {
      throw new Error(`ADO error ${err}`);
    }
  };

  fetchChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]> => {
    const gitApi = await this.#getConnection(workloadId).getGitApi();

    const changes = [];
    for (const branch of branches) {
      const filter: AdoItemFilter = { projectName: vcsProjectName, repositoryName, branch };

      const branchChanges = await getDataForDateRange(
        "repo-commits",
        filter,
        new Date(start),
        new Date(end),
        this.datastore,
        async (current) => {
          return this.#fetchChangesForDate(gitApi, workloadId, vcsProjectName, repositoryName, current, branch);
        },
      );
      changes.push(...branchChanges.flatMap((c) => c.changes));
    }
    return changes;
  };

  summariseChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]> => {
    const gitApi = await this.#getConnection(workloadId).getGitApi();

    const changes = [];
    for (const branch of branches) {
      const filter: AdoItemFilter = { projectName: vcsProjectName, repositoryName, branch };

      const summaries = await getDataForDateRange(
        "repo-changes",
        filter,
        new Date(start),
        new Date(end),
        this.datastore,
        async (current) => {
          return this.#summariseChangesForDate(gitApi, vcsProjectName, repositoryName, current, branch);
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
  };

  #fetchChangesForDate = async (
    gitApi: IGitApi,
    workloadId: string,
    vcsProjectName: string,
    repositoryName: string,
    date: Date,
    branch: string,
  ): Promise<StorableLike & AdoItemFilter & { changes: RepoChange[] }> => {
    try {
      logger(`Fetching changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
      const commits = await this.#fetchCommits(date, gitApi, repositoryName, vcsProjectName, branch);

      const changes: RepoChange[] = [];
      for (const commit of commits) {
        const commitDate = commit.committer?.date;
        if (!commitDate) {
          warn(`No committer date for commit: ${commit.commitId}`);
          continue;
        }

        changes.push({
          // keep full date/time
          date: commitDate.toISOString(),
          workload: workloadId,
          repo: repositoryName,
          branch,
          commitId: commit.commitId,
          message: commit.comment,
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
  };

  /**
   * Invoke the ADO API to list the changes for the given project repository on a given date.
   * @param gitApi
   * @param vcsProjectName
   * @param repositoryName
   * @param date
   * @param branch
   */
  #summariseChangesForDate = async (
    gitApi: IGitApi,
    vcsProjectName: string,
    repositoryName: string,
    date: Date,
    branch: string,
  ): Promise<RepoChangeSummary> => {
    try {
      logger(`Summarising changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date.toISOString()}`);

      const commits = await this.#fetchCommits(date, gitApi, repositoryName, vcsProjectName, branch);
      const changes = commits.map(
        (c) =>
          <FileChanges>{
            added: c.changeCounts["Add"] ?? 0,
            edited: c.changeCounts["Edit"] ?? 0,
            deleted: c.changeCounts["Delete"] ?? 0,
          },
      );
      const summary: RepoChangeSummary = {
        projectName: vcsProjectName,
        repositoryName,
        branch,
        date: truncateDateOnly(date),
        commits: commits.map((c) => c.commitId),
        changes,
      };
      return summary;
    } catch (err) {
      throw new Error(
        `Failed to summarise ${vcsProjectName}/${repositoryName}/${branch} changes on ${date.toISOString()} - error: ${err}`,
      );
    }
  };

  #fetchCommits = async (
    date: Date,
    gitApi: IGitApi,
    repositoryName: string,
    vcsProjectName: string,
    branch: string,
  ) => {
    try {
      const toDate = new Date(date.getTime() + MILLIS_PER_DAY);

      let commits = await limitConcurrencyAndRetry(limiter, async () =>
        gitApi.getCommits(
          repositoryName,
          {
            $top: 1000,
            fromDate: truncateDateOnly(date),
            toDate: truncateDateOnly(toDate),
            itemVersion: {
              version: branch,
              versionType: GitVersionType.Branch,
            },
          },
          vcsProjectName,
        ),
      );
      if (!commits) {
        console.warn(`No commits found for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
        commits = [];
      }
      logger(`${commits.length} commits in repo: ${repositoryName} on branch ${branch}`);
      return commits;
    } catch (e) {
      warn(`Failed to fetch commits for ${vcsProjectName}/${repositoryName}/${branch} - returning empty: ${e.message}`);
      verbose(e);
      return [];
    }
  };

  /**
   * List the repository names for the given ADO project. This lists *all* repositories,
   * not just those found in the code quality tool.
   *
   * @param workloadId
   * @param vcsProjectName
   */
  getReposForProject = async (workloadId: WorkloadId, vcsProjectName: string): Promise<string[]> => {
    const gitApi = await this.#getConnection(workloadId).getGitApi();
    const repositories = await gitApi.getRepositories(vcsProjectName);
    const repos = repositories.map((repo) => repo.name);
    logger(`Found ${repos.length} repos for ADO project: ${vcsProjectName}`);
    return repos;
  };

  /**
   * Uses the getPullRequestQuery API to structure a query for a single commit id
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param commitId
   * @returns
   */
  getPRForCommit = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    commitId: string,
  ): Promise<PullRequest | null> => {
    try {
      const gitApi = await this.#getConnection(workloadId).getGitApi();
      const res = (
        await gitApi.getPullRequestQuery(
          { queries: [{ items: [commitId], type: GitPullRequestQueryType.Commit }] },
          repositoryName,
          vcsProjectName,
        )
      ).results[0][commitId];

      if (res) {
        const obj = res[0];
        return {
          id: obj.pullRequestId,
          workloadId,
          vcsProjectName,
          repositoryName,
          sourceBranch: obj.sourceRefName.replace(REFS_HEADS_STR, ""),
          title: obj.title,
          message: obj.description,
          url: `${gitApi.baseUrl}/${vcsProjectName}/_git/${repositoryName}/pullrequest/${obj.pullRequestId}`,
          // url: obj.remoteUrl ?? obj.url,
        };
      }
      return null;
    } catch (e) {
      warn(`Failed to get PR from commit ${commitId} in ${vcsProjectName}/${repositoryName}`, e);
      return null;
    }
  };

  async getPRSizeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREventDetail[]> {
    throw new Error("Fetching PR Size is not implemented.");
  }

  getEarliestCommitForPr = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    pullRequestId: number,
  ): Promise<RepoChange> => {
    throw new Error("Fetching earliest commit for PR is not implemented.");
  };

  fetchFile = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
    path: string,
  ): Promise<string> => {
    throw new Error("Fetching file is not implemented.");
  };

  fetchMergeRules = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
  ): Promise<TMergeRules[]> => {
    throw new Error("Fetching merge rules is not implemented.");
  };

  buildCommitLink = (change: RepoChange, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/commit/${change.commitId}`;

  buildPRLink = (change: RepoChange, pr: PullRequest, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/pullrequest/${pr.id}`;

  buildRepoLink = (workloadId: WorkloadId, repoName: string): string =>
    `${getAllCodeManagementUrls()[workloadId]}/_git/${repoName}`;
}
