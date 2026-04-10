import parseGitDiff, { AnyFileChange } from "parse-git-diff";
import { type BitbucketServerConnection, createBitbuckerServerConnection } from "../../utils/bitbucketServerConnection";
import { DatedMetricEntry } from "../../model/metrics";
import { logger, verbose, warn } from "../../utils/logger/logger";
import {
  CommitFileChanges,
  CompletePrInfo,
  PREvent,
  PREventDetail,
  PrFileChangeItem,
  PullRequest,
  RepoChange,
  RepoChangeSummary,
} from "../../model/vcs";
import { provideDatastore } from "../../db/factory";
import { getAllCodeManagementConfig, getAllCodeManagementUrls, getWorkloadById } from "../../config/configMapping";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { registerVcs, VcsService } from "./vcsService";
import { MILLIS_PER_DAY, truncateDateOnly } from "../../utils/date";
import { getDataForDateRange } from "../dateWalker";
import { WorkloadId } from "../../model/config/workload-config";
import { CodeManagementTypes } from "../../model/config/common";
import { TMergeRules } from "../../model/qualityGates";

const COLLECTION_NAME_REPO_COMMITS = "repo-commits";
const COLLECTION_NAME_REPO_CHANGES = "repo-changes";

export const initBitbucketServerVcs = () =>
  registerVcs(CodeManagementTypes.BITBUCKET_SERVER, () => new BitbucketServerVcsService());

const listPullRequestFiles = async (
  connection: BitbucketServerConnection,
  vcsProjectName: string,
  repositoryName: string,
  pullRequestId: string,
): Promise<PrFileChangeItem[]> => {
  const rawGitDiffString = await connection.projects.repos.pullRequest.diff.get({
    projectKey: vcsProjectName,
    repositorySlug: repositoryName,
    pullRequestId: pullRequestId,
  });
  return normalisePullRequestFileList(rawGitDiffString, pullRequestId);
};

const normalisePullRequestFileList = (rawGitDiffString: string, pullRequestId: string): PrFileChangeItem[] => {
  const diff = parseGitDiff(rawGitDiffString).files;
  logger(`Found ${diff.length} files on PR ${pullRequestId}`);
  return diff.map((file) => {
    if (file.type == "RenamedFile") {
      return { path: file.pathAfter.startsWith("/") ? file.pathAfter : `/${file.pathAfter}` };
    }
    return { path: file.path.replace("dst://", "/") };
  });
};

class BitbucketServerVcsService implements VcsService {
  private connections: Map<string, BitbucketServerConnection>;
  private datastore: Datastore<QueryFilter, DatastoreCollection>;

  constructor() {
    this.datastore = provideDatastore("bitbucket-server-vcs", { ttlIfToday: 3600 });
    this.connections = new Map<string, BitbucketServerConnection>();
  }

  #getConnection(workloadId: WorkloadId) {
    let connection = this.connections.get(workloadId);
    if (!connection) {
      const workload = getWorkloadById(workloadId);
      const serverId = workload.codeManagement.serverId;
      const server = getAllCodeManagementConfig().bitbucketServer.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No Bitbucket server configuration found named: ${serverId}`);
      }
      const clientOptions = {
        auth: {
          authMethod: server.authMethod,
          username: server.username,
          password: server.apiKey,
        },
        baseUrl: server.url,
      };
      connection = createBitbuckerServerConnection(clientOptions);
      this.connections.set(workloadId, connection);
    }
    return connection;
  }

  getPROpenTimeFromRepo = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit = 1000,
  ): Promise<PREvent[]> => {
    try {
      const connection = this.#getConnection(workloadId);
      let prs: Awaited<ReturnType<typeof connection.projects.repos.pullRequests.get>> = [];
      try {
        const mergedPullRequests = await connection.projects.repos.pullRequests.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          state: "MERGED",
        });
        prs.push(
          ...mergedPullRequests.filter(({ closedDate }) => {
            const completedDate = new Date(closedDate);
            return completedDate >= startDate && completedDate <= endDate;
          }),
        );
        prs = prs.length > limit ? prs.slice(0, limit) : prs;
      } catch (err) {
        warn(`Error retrieving list of PRs: ${err}`);
      }
      return prs.reduce((acc, pr) => {
        const existing = acc.find((a) => a.repositoryName === repositoryName);
        const newValue = {
          date: truncateDateOnly(new Date(pr.closedDate)),
          created: pr.createdDate,
          untilReview: null,
          untilApproval: null,
          untilCompletion: new Date(pr.closedDate).getTime() - new Date(pr.createdDate).getTime(),
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
      throw new Error(`BitbucketServer.getPROpenTimeFromRepo processing error ${err}`);
    }
  };

  getPRsForIssuesFromRepository = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    ticketIds: string[],
    limit = 1000,
  ): Promise<CompletePrInfo[]> => {
    try {
      const connection = this.#getConnection(workloadId);
      let prs: CompletePrInfo[] = [];
      try {
        const allPullRequests = await connection.projects.repos.pullRequests.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          state: "MERGED",
        });

        const relevantPrs: { ticketId: string; pr: { id: number; title: string } }[] = [];
        allPullRequests
          .filter(({ title }) => !!title)
          .forEach((pr) => {
            for (const ticketId of ticketIds) {
              if (pr.title.match(new RegExp(`${ticketId}[^\\d]`, "g"))) {
                relevantPrs.push({ ticketId, pr: { id: pr.id, title: pr.title } });
                break;
              }
            }
          });

        for (const relevantPr of relevantPrs) {
          const complete: CompletePrInfo = {
            pr: {
              id: relevantPr.pr.id,
              title: relevantPr.pr.title,
              workloadId,
              vcsProjectName,
              repositoryName,
            },
            issueId: relevantPr.ticketId,
            filesChanged: [],
          };
          prs.push(complete);
        }
      } catch (err) {
        warn(`Error retrieving Bitbucket Server data: ${err}`);
      }
      prs = prs.length > limit ? prs.slice(0, limit) : prs;

      // find changed files
      for (const pr of prs) {
        pr.filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, "" + pr.pr.id);
      }

      logger(`Retrieved ${prs.length} total (limit: ${limit}) PRs for ticketIds: ${ticketIds}`);
      return prs;
    } catch (err) {
      throw new Error(`Bitbucket Server error ${err}`);
    }
  };

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
      let prs: Awaited<ReturnType<typeof connection.projects.repos.pullRequests.get>> = [];

      try {
        const mergedPullRequests = await connection.projects.repos.pullRequests.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          state: "MERGED",
        });
        prs = mergedPullRequests.filter(({ closedDate }) => {
          const completedDate = new Date(closedDate);
          return completedDate >= startDate && completedDate <= endDate;
        });
        if (limit) prs = prs.slice(0, limit);
      } catch (err) {
        warn(`Error retrieving list of PRs (Bitbucket Server): ${err}`);
      }

      const completePrs: CompletePrInfo[] = await Promise.all(
        prs.map(async (pr) => {
          const filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, `${pr.id}`);
          return {
            pr: {
              id: pr.id,
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
      throw new Error(`BitbucketServer.getPRsInDateRange error ${err}`);
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
    const startDate = new Date(start);
    const endDate = new Date(end);
    const allCommitChanges: CommitFileChanges[] = [];
    const processedCommits = new Set<string>();

    for (const branch of branches) {
      try {
        const commits = await connection.projects.repos.commits.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          since: startDate,
          until: endDate,
        });

        for (const commit of commits) {
          if (processedCommits.has(commit.id)) continue;
          processedCommits.add(commit.id);

          const changes = await connection.projects.repos.commit.changes.get({
            projectKey: vcsProjectName,
            repositorySlug: repositoryName,
            commitId: commit.id,
          });

          const filePaths = changes.map((change) => change.path.toString);

          allCommitChanges.push({
            commitId: commit.id,
            filePaths,
          });
        }
      } catch (err) {
        warn(`Bitbucket Server fetch commits failed ${branch}: ${err}`);
      }
    }

    return allCommitChanges;
  };

  fetchChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]> => {
    const connection = this.#getConnection(workloadId);

    const changes = [];
    for (const branch of branches) {
      const filter = { projectName: vcsProjectName, repositoryName, branch };

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
  };

  summariseChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]> => {
    const connection = this.#getConnection(workloadId);

    const changes = [];
    for (const branch of branches) {
      const filter = { projectName: vcsProjectName, repositoryName, branch };

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
  };

  /**
   * List the repository names for the given Bitbucket project. This lists *all* repositories,
   * not just those found in the code quality tool.
   *
   * @param workloadId
   * @param vcsProjectName
   */
  getReposForProject = async (workloadId: WorkloadId, vcsProjectName: string): Promise<string[]> => {
    const connection = this.#getConnection(workloadId);
    const repositories = await connection.projects.repos.get({
      projectKey: vcsProjectName,
    });
    const repos = repositories.map((repo) => repo.name);
    logger(`Found ${repos.length} repos for Bitbucket project: ${vcsProjectName}`);
    return repos;
  };

  getPRForCommit = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    commitId: string,
  ): Promise<PullRequest | null> => {
    try {
      const connection = this.#getConnection(workloadId);
      let pulls;
      try {
        pulls = await connection.projects.repos.commits.pullRequests.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          commitId: commitId,
        });
        if (pulls.length === 0) {
          return null;
        }
      } catch (e) {
        warn(`Failed to get PR from commit ${commitId} in ${vcsProjectName}/${repositoryName}.`, e);
        warn(
          "If you're seeing this error you may not have the 'Pull Request Commit Links' app installed yet. See here for more info: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-projectKey-repo-slug-commit-commit-pullrequests-get",
        );
        return null;
      }
      const firstMergedPr = await connection.projects.repos.pullRequest.get({
        projectKey: vcsProjectName,
        repositorySlug: repositoryName,
        pullRequestId: pulls[0].id,
      });
      if (firstMergedPr) {
        return {
          id: firstMergedPr.id,
          workloadId,
          vcsProjectName,
          repositoryName,
          sourceBranch: firstMergedPr.fromRef.id,
          title: firstMergedPr.title,
          message: firstMergedPr.description,
        };
      }
      return null;
    } catch (e) {
      warn(`Failed to get PR from commit ${commitId} in ${vcsProjectName}/${repositoryName}`, e);
      return null;
    }
  };

  async #summariseChangesForDate(
    connection: BitbucketServerConnection,
    vcsProjectName: string,
    repositoryName: string,
    date: Date,
    branch: string,
  ): Promise<RepoChangeSummary> {
    try {
      logger(`Summarising changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
      const commits = await this.#fetchCommits(date, connection, vcsProjectName, repositoryName, branch);

      const changes: { added: number; edited: number; deleted: number }[] = [];
      const commitIds: string[] = [];
      for (const commit of commits) {
        // Currently unable to get useful detail about the number of changes in the commit from this API.
        // const detail = await connection.projects.repos.commit.get({
        //   projectKey: vcsProjectName,
        //   repositorySlug: repositoryName,
        //   commitId: commit.id,
        // });
        const commitDate = commit.committerTimestamp;
        if (!commitDate) {
          warn(`No committer date for commit: ${commit.id}`);
          continue;
        }

        changes.push({
          added: 0 /* there's not an 'added' field in the API */,
          edited: 0 /* there's not an 'edited' field in the API */,
          deleted: 0 /* there's not a 'deleted' field in the API */,
        });

        commitIds.push(commit.id);
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

  async #fetchCommits(
    date: Date,
    connection: BitbucketServerConnection,
    vcsProjectName: string,
    repositoryName: string,
    branch: string,
  ) {
    try {
      const toDate = new Date(date.getTime() + MILLIS_PER_DAY);

      const allCommits = await connection.projects.repos.commits.get({
        projectKey: vcsProjectName,
        repositorySlug: repositoryName,
        since: date,
        until: toDate,
      });

      const commits = allCommits.filter(async (commit) => {
        const branches = await connection.projects.repos.branches.commit.get({
          projectKey: vcsProjectName,
          repositorySlug: repositoryName,
          commitId: commit.id,
        });

        return !!branches.find((currentBranch) => currentBranch.displayId === branch);
      });

      logger(`${commits.length} commits in repo: ${repositoryName}`);
      return commits;
    } catch (e) {
      warn(`Failed to fetch commits for ${vcsProjectName}/${repositoryName}/${branch} - returning empty: ${e.message}`);
      verbose(e);
      return [];
    }
  }

  async #fetchChangesForDate(
    connection: BitbucketServerConnection,
    workloadId: string,
    vcsProjectName: string,
    repositoryName: string,
    branch: string,
    date: Date,
  ): Promise<{
    date: string;
    projectName: string;
    repositoryName: string;
    branch: string;
    changes: RepoChange[];
  }> {
    try {
      logger(`Fetching changes for ${vcsProjectName}/${repositoryName}/${branch} on ${date}`);
      const commits = await this.#fetchCommits(date, connection, vcsProjectName, repositoryName, branch);

      const changes: RepoChange[] = [];
      for (const commit of commits) {
        const commitDate = commit.committerTimestamp;
        if (!commitDate) {
          warn(`No committer date for commit: ${commit.id}`);
          continue;
        }

        changes.push({
          date: new Date(commitDate).toISOString(),
          workload: workloadId,
          repo: repositoryName,
          branch,
          commitId: commit.id,
          message: commit.message,
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

  async getPRSizeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREventDetail[]> {
    warn("Fetching PR Size is not implemented.");
    return Promise.resolve([]);
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
    `${this.buildRepoLink(workloadId, change.repo)}/pull/${pr.id}`;

  buildRepoLink = (workloadId: WorkloadId, repoName: string): string =>
    `${getAllCodeManagementUrls()[workloadId]}/${repoName}`;

  buildFileLink = (workloadId: WorkloadId, repoName: string, branch: string, path: string): string =>
    `${this.buildRepoLink(workloadId, repoName)}/${path}`;
}

export const testables = {
  normalisePullRequestFileList,
};
