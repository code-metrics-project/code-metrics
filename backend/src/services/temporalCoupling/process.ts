import { TemporalCouplingData } from "../../model/temporalCoupling";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getWorkloadById } from "../../config/configMapping";
import { findTemporalCouplingForComponent } from "./analyse";
import { error, logger } from "../../utils/logger/logger";
import { getComponentsForWorkload } from "../../utils/repos";
import { SoftwareComponent, WorkloadId } from "../../model/config/workload-config";

const DEFAULT_THRESHOLD = 3;

const processComponent = async (
  workloadId: WorkloadId,
  component: SoftwareComponent,
  vcsProjectName: string,
  startDate: string,
  endDate: string,
  threshold: number,
): Promise<TemporalCouplingData> => {
  try {
    const vcs = getVcsForWorkload(getWorkloadById(workloadId));

    logger(`Fetching PRs for ${vcsProjectName}/${component.repo} from ${startDate} to ${endDate}`);

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const prs = await vcs.getPRsInDateRange(
      workloadId,
      vcsProjectName,
      component.repo,
      startDateObj,
      endDateObj,
    );

    logger(`Retrieved ${prs.length} PRs with file changes for ${component.name}`);

    return findTemporalCouplingForComponent(prs, component, workloadId, threshold);
  } catch (err) {
    error(`Error processing component ${vcsProjectName}/${component.name}: ${err}`);
    return {
      workloadId,
      componentName: component.name,
      repoName: component.repo,
      totalCommits: 0,
      couplingPairs: [],
    };
  }
};

const processRepoGroup = async (
  workloadId: WorkloadId,
  repoGroup: string,
  vcsProjectName: string,
  startDate: string,
  endDate: string,
  threshold: number,
): Promise<TemporalCouplingData[]> => {
  const workload = getWorkloadById(workloadId);
  const components = await getComponentsForWorkload(workload, [repoGroup]);

  return Promise.all(
    components.map((component) => processComponent(workloadId, component, vcsProjectName, startDate, endDate, threshold)),
  );
};

export const processAllComponents = async (
  workloadId: WorkloadId,
  startDate: string,
  endDate: string,
  threshold?: number,
): Promise<TemporalCouplingData[]> => {
  const workload = getWorkloadById(workloadId);
  const repoGroupNames = Object.keys(workload.codeManagement.repoGroups);
  const effectiveThreshold = threshold ?? DEFAULT_THRESHOLD;

  const result = await Promise.all(
    repoGroupNames.map(async (repoGroup) =>
      processRepoGroup(
        workloadId,
        repoGroup,
        workload.codeManagement.projectName,
        startDate,
        endDate,
        effectiveThreshold,
      ),
    ),
  );

  return result.flat();
};