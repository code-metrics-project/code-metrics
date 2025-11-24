import { CompletePrInfo, PREvent, PREventDetail, PullRequest, RepoChange, RepoChangeSummary } from "../../model/vcs";
import { DatedMetricEntry } from "../../model/metrics";
import { logger, verbose } from "../../utils/logger/logger";
import { getWorkloadById } from "../../config/configMapping";
import { provideDatastore } from "../../db/factory";
import { PRECACHE_REPO_LIST, precacheRepoList } from "./precache";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { CodeManagementTypes } from "../../model/config/common";
import { TMergeRules } from "../qualityGates/qualityGates";
import { getConfigItem, getConfigItemAsNumber } from "../../config/sources/source";

type RepoList = {
  key: string;
  value: any;
};

export const CACHE_REPO_LIST = getConfigItem("CACHE_REPO_LIST") !== "false";
const COLLECTION_NAME_COMMIT_PRS = "commit-prs";
const COLLECTION_NAME_EARLIEST_COMMIT = "earliest-commits";
const COLLECTION_NAME_VCS_CACHE = "vcs-cache";
const COLLECTION_NAME_FETCH_FILE = "fetch-file";
const COLLECTION_NAME_FETCH_MERGE_RULES = "fetch-merge-rules";

/**
 * Cache for 6 hours by default.
 */
const REPO_LIST_EXPIRY_SECONDS: number = getConfigItemAsNumber("REPO_LIST_EXPIRY_SECONDS", 21600)!;

const builders: Record<string, () => VcsService> = {};
const instances: Record<string, VcsService> = {};

/**
 * This should be called after all VCS service instances have been registered.
 * @see registerVcs
 */
export const initVcs = async () => {
  if (PRECACHE_REPO_LIST) await precacheRepoList();
};

export const registerVcs = (type: CodeManagementTypes, builder: () => VcsService) => {
  verbose(`Registered VCS implementation for: ${type}`);
  builders[type] = builder;
};

export const getVcsForWorkload = (workload: Workload): VcsService => getVcs(workload.codeManagement.type);

const getVcs = (type: string): VcsService => {
  let instance = instances[type];
  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`No implementation registered for type: ${type}`);
    }
    instance = builder();
    if (CACHE_REPO_LIST) {
      instance = new CachingVcsServiceImpl(instance);
    }
    instances[type] = instance;
  }
  return instance;
};

export type VcsService = {
  /**
   * List the repository names for the given VCS project (e.g. ADO project or GitHub org).
   * This lists *all* repositories, not just those found in the code quality tool.
   *
   * @param workloadId
   * @param vcsProjectName
   */
  getReposForProject(workloadId: WorkloadId, vcsProjectName: string): Promise<string[]>;

  /**
   * Calculate the duration that a pull request was open.
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param startDate
   * @param endDate
   * @param limit
   */
  getPROpenTimeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREvent[]>;

  getPRSizeFromRepo(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREventDetail[]>;

  /**
   * Get the pull requests in a repository associated with a list of issues.
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param issueIds
   * @param limit
   */
  getPRsForIssuesFromRepository(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    issueIds: string[],
    limit?: number,
  ): Promise<CompletePrInfo[]>;

  /**
   * Fetch all repository changes in the given date range.
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param branches
   * @param start date in format `yyyy-mm-dd`
   * @param end date in format `yyyy-mm-dd`
   */
  fetchChangesInDateRange(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]>;

  /**
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param branches[]
   * @param start date in format `yyyy-mm-dd`
   * @param end date in format `yyyy-mm-dd`
   */
  summariseChangesInDateRange(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]>;

  /**
   * Get the pull request associated with a commit.
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param commitId
   */
  getPRForCommit(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    commitId: string,
  ): Promise<PullRequest | null>;

  /**
   * Get the earliest commit within a pull request.
   * @param workloadId
   * @param vcsProjectName
   * @param repositoryName
   * @param pullRequestId
   */
  getEarliestCommitForPr(
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    pullRequestId: number,
  ): Promise<RepoChange>;

  /**
   * Build a user-facing URL to the commit.
   * @param change
   * @param workloadId
   * @param vcsProjectName
   */
  buildCommitLink(change: RepoChange, workloadId: WorkloadId, vcsProjectName?: string): string;

  /**
   * Build a user-facing URL to the pull request.
   * @param change
   * @param pr
   * @param workloadId
   */
  buildPRLink(change: RepoChange, pr: PullRequest, workloadId: WorkloadId): string;

  /**
   * Build a user-facing URL to the repository.
   * @param workloadId
   * @param repoName
   */
  buildRepoLink(workloadId: WorkloadId, repoName: string): string;

  /**
   * Fetch the quality gate manifest from a repository.
   * @param workloadId
   * @param vcsProjectName
   * @param repoName
   */
  fetchFile(workloadId: WorkloadId, vcsProjectName: string, repoName: string, path: string): Promise<string | null>;

  /**
   * Fetch the merge rules for a repository.
   * @param workloadId
   * @param vcsProjectName
   * @param repoName
   */
  fetchMergeRules(workloadId: WorkloadId, vcsProjectName: string, repoName: string): Promise<TMergeRules[]>;
};

export class CachingVcsServiceImpl implements VcsService {
  private delegate: VcsService;

  constructor(delegate: VcsService) {
    logger("VCS repo cache enabled");
    this.delegate = delegate;
  }

  // use VCS project name as the key (gets combined with server ID for uniqueness)
  getReposForProject = async (workloadId: WorkloadId, vcsProjectName: string): Promise<string[]> =>
    readThroughCacheSingleton(workloadId, vcsProjectName, async () => {
      logger(`Fetching repos from VCS project: ${vcsProjectName}`);
      return await this.delegate.getReposForProject(workloadId, vcsProjectName);
    });

  fetchChangesInDateRange = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<RepoChange[]> =>
    this.delegate.fetchChangesInDateRange(workloadId, vcsProjectName, repositoryName, branches, start, end);

  summariseChangesInDateRange = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    branches: string[],
    start: string,
    end: string,
  ): Promise<DatedMetricEntry<RepoChangeSummary>[]> =>
    this.delegate.summariseChangesInDateRange(workloadId, vcsProjectName, repositoryName, branches, start, end);

  getPROpenTimeFromRepo = (
    workload: string,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREvent[]> =>
    this.delegate.getPROpenTimeFromRepo(workload, vcsProjectName, repositoryName, startDate, endDate, limit);

  getPRSizeFromRepo = (
    workload: string,
    vcsProjectName: string,
    repositoryName: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
  ): Promise<PREventDetail[]> =>
    this.delegate.getPRSizeFromRepo(workload, vcsProjectName, repositoryName, startDate, endDate, limit);

  getPRsForIssuesFromRepository = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    issueIds: string[],
    limit?: number,
  ): Promise<CompletePrInfo[]> =>
    this.delegate.getPRsForIssuesFromRepository(workloadId, vcsProjectName, repositoryName, issueIds, limit);

  getPRForCommit = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    commitId: string,
  ): Promise<PullRequest | null> => {
    const key = vcsProjectName + "." + repositoryName + "." + commitId;
    return await findOrInsert(workloadId, key, COLLECTION_NAME_COMMIT_PRS, null, () =>
      this.delegate.getPRForCommit(workloadId, vcsProjectName, repositoryName, commitId),
    );
  };

  buildCommitLink = (change: RepoChange, workloadId: WorkloadId, vcsProjectName?: string): string =>
    this.delegate.buildCommitLink(change, workloadId, vcsProjectName);

  buildPRLink = (change: RepoChange, pr: PullRequest, workloadId: WorkloadId): string =>
    this.delegate.buildPRLink(change, pr, workloadId);

  buildRepoLink = (workloadId: WorkloadId, repoName: string): string =>
    this.delegate.buildRepoLink(workloadId, repoName);

  getEarliestCommitForPr = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repositoryName: string,
    pullRequestId: number,
  ): Promise<RepoChange> => {
    const key = vcsProjectName + "." + repositoryName + "." + pullRequestId;
    return findOrInsert(workloadId, key, COLLECTION_NAME_EARLIEST_COMMIT, null, () =>
      this.delegate.getEarliestCommitForPr(workloadId, vcsProjectName, repositoryName, pullRequestId),
    );
  };

  /**
   * Fetch the quality gate manifest from a repository.
   * @param workloadId
   * @param vcsProjectName
   * @param repoName
   */
  fetchFile = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    repoName: string,
    path: string,
  ): Promise<string | null> => {
    return findOrInsert(workloadId, `${vcsProjectName}.${repoName}.${path}`, COLLECTION_NAME_FETCH_FILE, 3600, () =>
      this.delegate.fetchFile(workloadId, vcsProjectName, repoName, path),
    );
  };

  /**
   * Fetch the merge rules for a repository.
   * @param workloadId
   * @param vcsProjectName
   * @param repoName
   */
  fetchMergeRules = (workloadId: WorkloadId, vcsProjectName: string, repoName: string): Promise<TMergeRules[]> => {
    return findOrInsert(workloadId, `${vcsProjectName}.${repoName}`, COLLECTION_NAME_FETCH_MERGE_RULES, 3600, () =>
      this.delegate.fetchMergeRules(workloadId, vcsProjectName, repoName),
    );
  };
}

/**
 * Holds in-flight queries to the VCS.
 */
const vcsQueries = new Map<string, Promise<any>>();

/**
 * Singleton pattern for reading through the cache.
 * @param workloadId
 * @param key
 * @param populator
 */
const readThroughCacheSingleton = async <T>(
  workloadId: string,
  key: string,
  populator: () => Promise<T>,
): Promise<T> => {
  const serverId = getWorkloadById(workloadId).codeManagement.serverId;
  const compositeKey = serverId + "." + key;

  let activeQuery = vcsQueries.get(compositeKey);
  if (!activeQuery) {
    activeQuery = (async () => {
      try {
        return await findOrInsert(
          workloadId,
          compositeKey,
          COLLECTION_NAME_VCS_CACHE,
          REPO_LIST_EXPIRY_SECONDS,
          populator,
        );
      } finally {
        vcsQueries.delete(compositeKey);
      }
    })();
    vcsQueries.set(compositeKey, activeQuery);
  }

  return await activeQuery;
};

/**
 * Find or insert a value into the cache.
 * @param workloadId
 * @param key
 * @param collectionName
 * @param expireAfterSeconds
 * @param populator
 */
const findOrInsert = async <T>(
  workloadId: string,
  key: string,
  collectionName: string,
  expireAfterSeconds: number | null,
  populator: () => Promise<T>,
) => {
  const serverId = getWorkloadById(workloadId).codeManagement.serverId;
  const compositeKey = serverId + "." + key;

  const cache = provideDatastore(`${compositeKey}-${collectionName}`, {
    expireAfterSeconds,
  });
  const cached = await cache.findOrInsertOne<RepoList>(
    collectionName,
    { key: compositeKey },
    async () => {
      verbose(`Fetching ${collectionName} with key: ${compositeKey}`);
      return {
        key: compositeKey,
        value: await populator(),
      };
    },
    // only cache if we have a value
    (cachedValue) => !!cachedValue?.value,
  );
  return cached.value;
};
