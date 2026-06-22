import { type APIClient, Bitbucket } from "bitbucket";
import { AsyncResponse } from "bitbucket/lib/bitbucket";
import fetch from "node-fetch";
import { DatedMetricEntry } from "../../model/metrics";
import { logger, warn } from "../../utils/logger/logger";
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
import { TMergeRules } from "../../model/qualityGates";
import { provideDatastore } from "../../db/factory";
import { getAllCodeManagementConfig, getAllCodeManagementUrls, getWorkloadById } from "../../config/configMapping";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { registerVcs, registerVcsConnectionChecker, VcsService } from "./vcsService";
import { truncateDateOnly } from "../../utils/date";
import { WorkloadId } from "../../model/config/workload-config";
import { CodeManagementTypes } from "../../model/config/common";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { CodeManagementServer, RemoteServer } from "../../model/config/remote-config";

/**
 * Check connectivity to Bitbucket Cloud by calling the user endpoint.
 */
const checkBitbucketCloudConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const codeManagementServer = server as CodeManagementServer;
  const url = codeManagementServer.url || "https://api.bitbucket.org/2.0";

  if (!codeManagementServer.username || !codeManagementServer.apiKey) {
    return {
      id: server.id,
      category: "codeManagement",
      type: CodeManagementTypes.BITBUCKET_CLOUD,
      url,
      status: "unconfigured",
      statusDetail: "No username or API key configured",
    };
  }

  try {
    const authString = Buffer.from(`${codeManagementServer.username}:${codeManagementServer.apiKey}`).toString("base64");
    const response = await fetch(`${url}/user`, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.BITBUCKET_CLOUD,
        url,
        status: "connected",
        responseTimeMs,
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const detail = retryAfter ? `Rate limited. Retry after ${retryAfter} seconds` : "Rate limited";
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.BITBUCKET_CLOUD,
        url,
        status: "rateLimited",
        statusDetail: detail,
        responseTimeMs,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        id: server.id,
        category: "codeManagement",
        type: CodeManagementTypes.BITBUCKET_CLOUD,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "codeManagement",
      type: CodeManagementTypes.BITBUCKET_CLOUD,
      url,
      status: "error",
      statusDetail: `HTTP ${response.status}: ${response.statusText}`,
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      id: server.id,
      category: "codeManagement",
      type: CodeManagementTypes.BITBUCKET_CLOUD,
      url,
      status: "unreachable",
      statusDetail: err.name || err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initBitbucketCloudVcs = () => {
  registerVcs(CodeManagementTypes.BITBUCKET_CLOUD, () => new BitbucketCloudVcsService());
  registerVcsConnectionChecker(CodeManagementTypes.BITBUCKET_CLOUD, checkBitbucketCloudConnection);
};

async function paginate<T, U extends { values?: U["values"] }>(
  connection: APIClient,
  method: (options: T) => AsyncResponse<U>,
  options: T,
): Promise<U["values"]> {
  const responses = [(await method(options)).data];

  let complete = false;
  while (!complete) {
    const currentResponse = responses[responses.length - 1];
    if (connection.hasNextPage(currentResponse)) {
      responses.push((await connection.getNextPage(currentResponse)).data);
    } else {
      complete = true;
    }
  }

  return responses.map((response) => response.values).flat();
}

const listPullRequestFiles = async (
  connection: APIClient,
  vcsProjectName: string,
  repositoryName: string,
  pullRequestId: number,
): Promise<PrFileChangeItem[]> => {
  const files = await paginate(connection, connection.pullrequests.getDiffStat, {
    workspace: vcsProjectName,
    repo_slug: repositoryName,
    pull_request_id: pullRequestId,
    fields: "next,values.new.path",
  });
  logger(`Found ${files.length} files on PR ${pullRequestId}`);
  return files.map((file) => {
    const path = file.new.path.startsWith("/") ? file.new.path : `/${file.new.path}`;
    return { path };
  });
};

class BitbucketCloudVcsService implements VcsService {
  private connections: Map<string, APIClient>;
  private datastore: Datastore<QueryFilter, DatastoreCollection>;

  constructor() {
    this.datastore = provideDatastore("bitbucket-cloud-vcs", { ttlIfToday: 3600 });
    this.connections = new Map<string, APIClient>();
  }

  #getConnection(workloadId: WorkloadId) {
    let connection = this.connections.get(workloadId);
    if (!connection) {
      const workload = getWorkloadById(workloadId);
      const serverId = workload.codeManagement.serverId;
      const server = getAllCodeManagementConfig().bitbucketCloud.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No Bitbucket cloud configuration found named: ${serverId}`);
      }
      const clientOptions = {
        auth: {
          username: server.username,
          password: server.apiKey,
        },
        baseUrl: server.url,
      };
      connection = new Bitbucket(clientOptions);
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
      let prs = [];
      try {
        const resp = await paginate(connection, connection.pullrequests.list, {
          workspace: vcsProjectName,
          repo_slug: repositoryName,
          state: "MERGED",
          fields: "next,values.created_on,values.updated_on",
          q: `updated_on>=${startDate.toISOString()} AND updated_on<=${endDate.toISOString()}`,
        });
        prs.push(
          ...resp.filter(({ updated_on }) => {
            const completedDate = new Date(updated_on);
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
          date: truncateDateOnly(new Date(pr.updated_on)),
          created: pr.created_on,
          untilReview: null,
          untilApproval: null,
          untilCompletion: new Date(pr.updated_on).getTime() - new Date(pr.created_on).getTime(),
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
      throw new Error(`BitbucketCloud.getPROpenTimeFromRepo processing error ${err}`);
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
      const connection = this.#getConnection(workloadId);
      let prs: CompletePrInfo[] = [];
      try {
        const allPullRequests = await paginate(connection, connection.pullrequests.list, {
          workspace: vcsProjectName,
          repo_slug: repositoryName,
          state: "MERGED",
          fields: "next,values.title,values.id",
        });

        const relevantPrs: { issueId: string; pr: { id: number; title: string } }[] = [];
        allPullRequests
          .filter(({ title }) => !!title)
          .forEach((pr) => {
            for (const issueId of issueIds) {
              if (pr.title.match(new RegExp(`${issueId}[^\\d]`, "g"))) {
                relevantPrs.push({ issueId, pr: { id: pr.id, title: pr.title } });
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
            issueId: relevantPr.issueId,
            filesChanged: [],
          };
          prs.push(complete);
        }
      } catch (err) {
        warn(`Error retrieving Bitbucket Cloud data: ${err}`);
      }
      prs = prs.length > limit ? prs.slice(0, limit) : prs;

      // find changed files
      for (const pr of prs) {
        pr.filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, pr.pr.id);
      }

      logger(`Retrieved ${prs.length} total (limit: ${limit}) PRs for issueIds: ${issueIds}`);
      return prs;
    } catch (err) {
      throw new Error(`BitBucket Cloud error ${err}`);
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
      let prs = [];
      try {
        const resp = await paginate(connection, connection.pullrequests.list, {
          workspace: vcsProjectName,
          repo_slug: repositoryName,
          state: "MERGED",
          fields: "next,values.id,values.title,values.updated_on",
          q: `updated_on>=${startDate.toISOString()} AND updated_on<=${endDate.toISOString()}`,
        });
        prs = resp.filter(({ updated_on }) => {
          const completedDate = new Date(updated_on);
          return completedDate >= startDate && completedDate <= endDate;
        });
        if (limit) prs = prs.slice(0, limit);
      } catch (err) {
        warn(`Error retrieving list of PRs from Bitbucket Cloud: ${err}`);
        return [];
      }

      const completePrs: CompletePrInfo[] = await Promise.all(
        prs.map(async (pr) => {
          const filesChanged = await listPullRequestFiles(connection, vcsProjectName, repositoryName, pr.id);
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
      throw new Error(`BitbucketCloud.getPRsInDateRange error ${err}`);
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
    try {
      const connection = this.#getConnection(workloadId);
      const allCommitChanges: CommitFileChanges[] = [];
      const processedCommits = new Set<string>();

      for (const branch of branches) {
        try {
          const commits = await paginate(connection, connection.commits.list, {
            workspace: vcsProjectName,
            repo_slug: repositoryName,
            include: branch,
          });

          for (const commit of commits) {
            const commitDate = new Date(commit.date);
            if (commitDate < new Date(start) || commitDate > new Date(end)) continue;

            if (processedCommits.has(commit.hash)) continue;
            processedCommits.add(commit.hash);

            const diffStat = (await paginate(connection, (connection.repositories as any).getDiffStat, {
              workspace: vcsProjectName,
              repo_slug: repositoryName,
              spec: commit.hash,
              fields: "next,values.new.path",
            })) as any[];

            const filePaths = diffStat.map((f: any) => f.new?.path || "").filter((p: string) => !!p);

            allCommitChanges.push({
              commitId: commit.hash,
              filePaths,
            });
          }
        } catch (err) {
          warn(`Bitbucket Cloud fetch commits failed for branch ${branch}: ${err}`);
        }
      }

      return allCommitChanges;
    } catch (err) {
      throw new Error(`BitbucketCloud.getCommitFileChanges error ${err}`);
    }
  };

  fetchChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]> => Promise.resolve([]);

  summariseChangesInDateRange = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]> => Promise.resolve([]);

  /**
   * List the repository names for the given Bitbucket project. This lists *all* repositories,
   * not just those found in the code quality tool.
   *
   * @param workloadId
   * @param vcsProjectName
   */
  getReposForProject = async (workloadId: WorkloadId, vcsProjectName: string): Promise<string[]> => {
    const connection = this.#getConnection(workloadId);
    const repositories = await paginate(connection, connection.repositories.list, {
      workspace: vcsProjectName,
      fields: "next,values.name",
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
        pulls = await paginate(connection, connection.pullrequests.listForCommit, {
          workspace: vcsProjectName,
          repo_slug: repositoryName,
          commit: commitId,
          fields: "next,values.id",
        });
      } catch (e) {
        warn(`Failed to get PR from commit ${commitId} in ${vcsProjectName}/${repositoryName}.`, e);
        warn(
          "If you're seeing this error you may not have the 'Pull Request Commit Links' app installed yet. See here for more info: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-commit-commit-pullrequests-get",
        );
        return null;
      }
      const firstMergedPr = await connection.pullrequests.get({
        workspace: vcsProjectName,
        repo_slug: repositoryName,
        pull_request_id: pulls[0].id,
        fields: "id,source.branch.name,title,summary.raw",
      });
      if (firstMergedPr.data) {
        return {
          id: firstMergedPr.data.id,
          workloadId,
          vcsProjectName,
          repositoryName,
          sourceBranch: firstMergedPr.data.source.branch.name,
          title: firstMergedPr.data.title,
          message: firstMergedPr.data.summary.raw,
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
