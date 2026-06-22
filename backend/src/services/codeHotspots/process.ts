import { PathData, RepoData } from "../../model/vcs";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getWorkloadById } from "../../config/configMapping";
import { involvesBypass } from "./involvesBypass";
import { involvesPath } from "./involvesPath";
import { findCodeHotspotsForPRs } from "./analyse";
import { error, logger } from "../../utils/logger/logger";
import { getComponentsForWorkload } from "../../utils/repos";
import { SoftwareComponent, WorkloadId } from "../../model/config/workload-config";
import { getEnvConfigItemAsNumber } from "../../config/sources/source";

const TICKETMAP_MAX = getEnvConfigItemAsNumber("CODE_HOTSPOTS_TICKETMAP_MAX", 50);

const getPathChecks = (repoGroup: string): string[] => {
  // FIXME externalise
  switch (repoGroup) {
    // case "backend":
    //   return ["/lambdas", "/src"];
    // case "frontend":
    //   return ["/router", "/src", "/store"];
    default:
      return ["/"];
  }
};

const processComponent = async (
  workloadId: WorkloadId,
  component: SoftwareComponent,
  issueIds: string[],
  vcsProjectName: string,
  pathsCheck: string[] = [],
): Promise<PathData[]> => {
  try {
    const vcs = getVcsForWorkload(getWorkloadById(workloadId));
    const prs = await vcs.getPRsForIssuesFromRepository(workloadId, vcsProjectName, component.repo, issueIds);

    if (prs.length) {
      // TODO shouldn't the return value of this call to involvesBypass be returned in the path data?
      involvesBypass(prs);

      for (const path of pathsCheck) {
        // TODO shouldn't the return value of this call to involvesPath be returned in the path data?
        involvesPath(prs, path);
      }
      return await findCodeHotspotsForPRs(workloadId, prs, component, TICKETMAP_MAX);
    } else {
      logger(`No PRs found for recent ${workloadId} tickets in ${vcsProjectName}/${component.repo}`);
      return [];
    }
  } catch (err) {
    error(`Error processing component ${vcsProjectName}/${component.name}: ${err}`);
    return [];
  }
};

const processRepoGroup = async (
  workloadId: WorkloadId,
  issueIds: string[],
  repoGroup: string,
  vcsProjectName: string,
): Promise<RepoData[]> => {
  const workload = getWorkloadById(workloadId);
  const components = await getComponentsForWorkload(workload, [repoGroup]);
  const paths = getPathChecks(repoGroup);
  return Promise.all(
    components.map(
      async (component) =>
        <RepoData>{
          workloadId,
          componentName: component.name,
          repoName: component.repo,
          pathData: await processComponent(workloadId, component, issueIds, vcsProjectName, paths),
        },
    ),
  );
};

export const processAllIssues = async (issueIds: string[], workloadId: WorkloadId): Promise<RepoData[]> => {
  const workload = getWorkloadById(workloadId);
  const repoGroupNames = Object.keys(workload.codeManagement.repoGroups);

  const result = await Promise.all(
    repoGroupNames.map(async (repoGroup) =>
      processRepoGroup(workloadId, issueIds, repoGroup, workload.codeManagement.projectName),
    ),
  );

  return result.flat();
};
