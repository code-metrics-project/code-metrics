import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { registerVcs, VcsService } from "./vcsService";
import {
  FileChanges,
  PREvent,
  PullRequest,
  RepoChange,
  RepoChangeSummary,
  CompletePrInfo,
  PrFileChangeItem,
  PREventDetail,
} from "../../model/vcs";
import { DatedMetricEntry } from "../../model/metrics";
import { getAllCodeManagementConfig, getAllCodeManagementUrls, getWorkloadById } from "../../config/configMapping";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { MILLIS_PER_DAY, truncateDateOnly } from "../../utils/date";
import { provideDatastore } from "../../db/factory";
import { StorableLike, getDataForDateRange } from "../dateWalker";
import { WorkloadId } from "../../model/config/workload-config";
import {CodeManagementTypes} from "../../model/config/common";

const COLLECTION_NAME_REPO_COMMITS = "repo-commits";
const COLLECTION_NAME_REPO_CHANGES = "repo-changes";
const EXPIRY_SECONDS: number = process.env.EXPIRY_SECONDS ? parseInt(process.env.EXPIRY_SECONDS) : 3600;

type GithubItemFilter = {
  projectName: string;
  repositoryName: string;
  branch: string;
};

type ChangesQueryResult = StorableLike & GithubItemFilter & { changes: RepoChange[] };

const repoTypes = ["public", "private", "internal"];

export const initGithubVcs = () => registerVcs(CodeManagementTypes.GITHUB, () => new GithubVcsService());

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
      connection = new Octokit({
        auth: server.apiKey,
        baseUrl: server.url,
      });
      this.connections.set(workloadId, connection);
    }
    return connection;
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

  async getReposForProject(workloadId: WorkloadId, vcsProject: string): Promise<string[]> {
    const connection = this.#getConnection(workloadId);

    const repoPromises = repoTypes.map(async (repoType) => {
      try {
        const resp: { name }[] = await connection.paginate(connection.repos.listForOrg, {
          org: vcsProject,
          type: repoType as any,
          per_page: 100,
        });
        return resp.map((repo) => repo.name);
      } catch (e) {
        warn(`Failed to list ${repoType} repos for ${vcsProject} - returning empty list: ${e.message}`);
        verbose(e);
        return [];
      }
    });

    const allRepos: string[] = (await Promise.all(repoPromises)).flat();
    logger(`Retrieved ${allRepos.length} total repos for github org: ${vcsProject}`);
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
    logger(`Earliest commit for PR ${pullRequestId} for workload ${workloadId} in repo ${repositoryName} is ${earliestCommit.sha} on ${earliestCommit.commit.committer.date}`);
    return <RepoChange>{
      date: earliestCommit.commit.committer.date,
      workload: workloadId,
      repo: repositoryName,
      branch: earliestCommit.commit.tree.sha,
      commitId: earliestCommit.sha,
      message: earliestCommit.commit.message,
    };
  };

  buildCommitLink = (change: RepoChange, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/commit/${change.commitId}`;

  buildPRLink = (change: RepoChange, pr: PullRequest, workloadId: WorkloadId): string =>
    `${this.buildRepoLink(workloadId, change.repo)}/pull/${pr.id}`;

  buildRepoLink = (workloadId: WorkloadId, repoName: string): string =>
    `${getAllCodeManagementUrls()[workloadId]}/${repoName}`;
}
