import { AggregatedFileChanges, EnrichedRepoChange, FileChanges, RepoChange } from "../../model/vcs";
import { getVcsBranches, getWorkloadById } from "../../config/configMapping";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getIssueMgmtForWorkload } from "../projectManangement/issueMgmtService";
import { getReposForWorkloadId } from "../../utils/repos";
import { logger, verbose } from "../../utils/logger/logger";
import { vcsLimiter } from "./vcs-limiter";
import { discoverLinks } from "../../utils/commits";

const NO_CHANGES = <FileChanges>{ added: 0, edited: 0, deleted: 0 };

/**
 * Fetches changes in a set of repository groups for a given date range.
 * @param workloadIds
 * @param repoGroups
 * @param startDate
 * @param endDate
 * @param populateLinks
 */
export async function fetchRepoChanges(
  workloadIds: string[],
  repoGroups: string[],
  startDate: Date,
  endDate: Date,
  populateLinks: boolean,
): Promise<RepoChange[]> {
  const changePromises: Promise<RepoChange[]>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      console.warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);
    const issueMgmt = getIssueMgmtForWorkload(workload);

    // TODO: Refactor data model with repoName
    const branches = getVcsBranches(workload.codeManagement.type);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for changes in ${repoNames.length} projects`);

    for (const repoName of repoNames) {
      const changePromise = vcsLimiter.schedule(async () => {
        const vcsProjectName = workload.codeManagement.projectName;

        const changes = await vcs.fetchChangesInDateRange(
          workload.id,
          vcsProjectName,
          repoName,
          branches, // TODO: Move alongside repoName config
          startDate.toISOString(),
          endDate.toISOString(),
        );

        if (populateLinks) {
          // extract issue ID programmatically instead of storing, in case matching regex changes
          const enriched: Promise<EnrichedRepoChange>[] = changes.flatMap(async (c) => {
            const links = await discoverLinks(workloadId, vcsProjectName, vcs, issueMgmt, c);
            return { ...c, links };
          });
          return Promise.all(enriched);
        } else {
          return changes;
        }
      });
      changePromises.push(changePromise);
    }
  }

  const result = (await Promise.all(changePromises)).flat();
  verbose(`Repo change report:`, result);
  return result;
}

export const aggregateChanges = (changes: FileChanges[]): AggregatedFileChanges => {
  const aggregated = changes.reduce((previousValue, currentValue) => {
    return <AggregatedFileChanges>{
      added: previousValue.added + currentValue.added,
      edited: previousValue.edited + currentValue.edited,
      deleted: previousValue.deleted + currentValue.deleted,
    };
  }, NO_CHANGES);
  return { ...aggregated, count: changes.length };
};
