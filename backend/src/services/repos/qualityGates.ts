import { getQualityGatesByWorkloadId, getWorkloadById, listWorkloadIds } from "../../config/configMapping";
import { QualityGatesConfig } from "../../model/config/quality-gates-config";
import { error, verbose, warn } from "../../utils/logger/logger";
import { getReposForWorkloadId } from "../../utils/repos";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { Workload } from "../../model/config/workload-config";

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

export type TPhase = {
  phase: string;
  gates: TQualityGate[];
};

export type TGate = {
  [key: string]: TPhase[];
};

export type TQualityGateOutput = {
  $schema?: string;
  repo?: string;
  repoLink?: string;
  services?: {
    "service-tag": string;
    "quality-gates": TGate;
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
    error("Error parsing JSON:", parseError);
    return null;
  }
}

const fillMissingQualityGates = (checks: string[], qualityGates: TQualityGate[]): { [key: string]: TQualityGate[] } => {
  const reshaped = checks.reduce((acc, value) => {
    acc[value] = qualityGates.filter((gate) => gate["check-types"].includes(value));
    return acc;
  }, {});

  return reshaped;
};

const fillMissingPhases = (environments: string[], qualityGates: { [key: string]: TQualityGate[] }): TGate => {
  const reshaped = Object.entries(qualityGates).reduce((acc, [key, value]) => {
    acc[key] = environments.map((phase) => {
      return {
        phase,
        gates: value.filter((gate) => gate.phase === phase)
      };
    });
    return acc;
  }, {});

  return reshaped;
};

export function enrichManifest(
  repo: string,
  repoLink: string,
  manifest: TQualityGateManifest,
  rules: TMergeRules[],
  qualityGatesConfig: QualityGatesConfig
): TQualityGateOutput {
  if (!manifest) return { repo, repoLink };
  /**
   * Github uses the job name as the only connection point between a workflow and a required status check
   * which means this is the only tool we can use to check if a job is actually required pre-merge.
   * This has obvious implications if two workflows have jobs with the same name. This is a known issue
   * with Github: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-branch-protection-rules
   */
  manifest.services.forEach((service) => {
    service["quality-gates"].forEach((qualityGate) => {
      if (!rules) return;

      const ruleNames = rules.map((rule) => rule.name);
      if (ruleNames.includes(qualityGate.config.name)) {
        qualityGate.isRequiredStatusCheck = true;
      } else {
        qualityGate.isRequiredStatusCheck = false;
      }
    });
  });

  const services = manifest.services.map((service) => {
    return {
      ...service,
      ["quality-gates"]: fillMissingPhases(
        qualityGatesConfig.environments,
        fillMissingQualityGates(qualityGatesConfig.gates, service["quality-gates"])
      )
    };
  });

  return {
    repo,
    repoLink,
    services
  };
}

/**
 * Fetch and construct a quality gate object for a given repo in a workload.
 * @param workload
 * @param repoName
 */
const getQualityGate = async (
  workload: Workload,
  repoName: string
): Promise<TQualityGateOutput> => {
  const vcs = getVcsForWorkload(workload);
  const workloadId = workload.id;
  try {
    const [manifest, rules] = await Promise.all([
      parseManifest(
        await vcs.fetchFile(workloadId, workload.codeManagement.projectName, repoName, "quality-gate.manifest.json")
      ),
      vcs.fetchMergeRules(workloadId, workload.codeManagement.projectName, repoName)
    ]);
    const qualityGate = enrichManifest(
      repoName,
      vcs.buildRepoLink(workloadId, repoName),
      manifest,
      rules,
      getQualityGatesByWorkloadId(workloadId)
    );

    verbose(`Fetched quality gate manifest for repo ${repoName} in workload ${workloadId}:`, qualityGate);
    return qualityGate;

  } catch (error) {
    warn(`Failed to fetch quality gate manifest for repo ${repoName} in workload ${workloadId}:`, error);
    // Return a basic quality gate object for repos that fail to fetch
    return {
      repo: repoName,
      services: [],
    };
  }
};

export const getQualityGates = async (
  requestWorkloadIds: string[],
  repoGroups: string[]
): Promise<TQualityGateManifest[]> => {
  const qualityGateQueue = [];

  const workloadIds = requestWorkloadIds.length ? requestWorkloadIds : listWorkloadIds();

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);

    qualityGateQueue.push(
      ...repoNames.map((repoName) => getQualityGate(workload, repoName))
    );
  }

  const qualityGates = await Promise.all(qualityGateQueue);

  verbose(`Quality gate report:`, qualityGates);
  return qualityGates;
};
