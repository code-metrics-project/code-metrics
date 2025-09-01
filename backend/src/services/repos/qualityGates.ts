import { getWorkloadById, listWorkloadIds } from "../../config/configMapping";
import { verbose } from "../../utils/logger/logger";
import { getReposForWorkloadId } from "../../utils/repos";
import { getVcsForWorkload } from "../codeManagement/vcsService";

type TQualityGate = {
  "check-types": string[];
  provider: string;
  phase: "pre-merge";
  config: {
    file: string;
    path: string;
    name: string;
  };
  isRequiredStatusCheck?: boolean;
};

export type TQualityGateManifest = {
  $schema?: string;
  repo?: string;
  repoLink?: string;
  services?: {
    "service-tag": string;
    "quality-gates": TQualityGate[];
  }[];
};

export type TMergeRules = {
  id: number;
  name: string;
};

function parseManifest(file: string) {
  try {
    return JSON.parse(file as unknown as string) as TQualityGateManifest;
  } catch (parseError) {
    console.error("Error parsing JSON:", parseError);
    return null;
  }
}

function enrichManifest(
  repo: string,
  repoLink: string,
  manifest: TQualityGateManifest,
  rules: TMergeRules[],
): TQualityGateManifest {
  if (!manifest) return { repo, repoLink };
  /**
   * Github uses the job name as the only connection point between a workflow and a required status check
   * which means this is the only tool we can use to check if a job is actually required pre-merge.
   * This has obvious implications if two workflows have jobs with the same name. This is a known issue
   * with Github: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-branch-protection-rules
   */
  manifest.services.forEach((service) => {
    service["quality-gates"].forEach((qualityGate) => {
      const ruleNames = rules.map((rule) => rule.name);
      if (ruleNames.includes(qualityGate.config.name)) {
        qualityGate.isRequiredStatusCheck = true;
      }
    });
  });
  return { repo, repoLink, ...manifest };
}

export const getQualityGates = async (
  requestWorkloadIds: string[],
  repoGroups: string[],
): Promise<TQualityGateManifest[]> => {
  const qualityGateQueue = [];

  const workloadIds = requestWorkloadIds.length ? requestWorkloadIds : listWorkloadIds();

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      console.warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);

    qualityGateQueue.push(
      ...repoNames.map(async (repoName) => {
        const [manifest, rules] = await Promise.all([
          parseManifest(
            await vcs.fetchFile(
              workloadId,
              workload.codeManagement.projectName,
              repoName,
              "quality-gate.manifest.json",
            ),
          ),
          vcs.fetchMergeRules(workloadId, workload.codeManagement.projectName, repoName),
        ]);
        const qualityGate = enrichManifest(repoName, vcs.buildRepoLink(workloadId, repoName), manifest, rules);
        return qualityGate;
      }),
    );
  }

  const qualityGates = await Promise.all(qualityGateQueue);

  verbose(`Quality gate report:`, qualityGates);
  return qualityGates;
};
