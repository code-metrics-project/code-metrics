import {
  getQualityGatesByWorkloadId,
  getWorkloadById,
  listRepoGroups,
  listWorkloadIds,
} from "../../config/configMapping";
import { QualityGatesConfig } from "../../model/config/quality-gates-config";
import { error, verbose, warn } from "../../utils/logger/logger";
import { getReposForWorkloadId } from "../../utils/repos";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { Workload } from "../../model/config/workload-config";
import { getConfigItemAsNumber } from "../../config/sources/source";

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
  repoGroup?: string;
  repoLink?: string;
  services?: {
    "service-tag": string;
    "quality-gates": TGate;
  }[];
  workloadId?: string;
};

export type TMergeRules = {
  id: number;
  name: string;
};

export type TRepoGroupQualityGates = {
  headline: {
    denominator: number;
    missing: number;
    numerator: number;
    variant: "success" | "warning" | "danger" | "no_data";
  };
  repos: TQualityGateOutput[];
  repoGroup: string;
  workloadId: string;
};

export type TWorkloadQualityGates = {
  workloadId: string;
  repoGroups: TRepoGroupQualityGates[];
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
        gates: value.filter((gate) => gate.phase === phase),
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
  qualityGatesConfig: QualityGatesConfig,
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
        fillMissingQualityGates(qualityGatesConfig.gates, service["quality-gates"]),
      ),
    };
  });

  return {
    repo,
    repoLink,
    services,
  };
}

/**
 * Fetch and construct a quality gate object for a given repo in a workload.
 * @param workload
 * @param repoName
 */
const getQualityGate = async (workload: Workload, repoName: string): Promise<TQualityGateOutput> => {
  const vcs = getVcsForWorkload(workload);
  const workloadId = workload.id;
  try {
    const [manifest, rules] = await Promise.all([
      parseManifest(
        await vcs.fetchFile(workloadId, workload.codeManagement.projectName, repoName, "quality-gate.manifest.json"),
      ),
      vcs.fetchMergeRules(workloadId, workload.codeManagement.projectName, repoName),
    ]);
    const qualityGate = enrichManifest(
      repoName,
      vcs.buildRepoLink(workloadId, repoName),
      manifest,
      rules,
      getQualityGatesByWorkloadId(workloadId),
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

const qualityGateDangerThreshold = getConfigItemAsNumber("QUALITY_GATE_THRESHOLD_DANGER", 30);
const qualityGateWarningThreshold = getConfigItemAsNumber("GUALITY_GATE_THRESHOLD_WARNING", 80);

const getVariant = (numerator?: number, denominator?: number): "success" | "warning" | "danger" | "no_data" => {
  if (typeof numerator !== "number" || typeof denominator !== "number" || denominator === 0) return "no_data";

  const percentage = (numerator / denominator) * 100;

  if (percentage >= qualityGateWarningThreshold) {
    return "success";
  } else if (percentage >= qualityGateDangerThreshold) {
    return "warning";
  } else {
    return "danger";
  }
};

const getWorstNumeratorAndDenominator = (repoGroup: string, repos: TQualityGateOutput[]) => {
  const repoScores = repos.map((repo) => {
    if (!repo.services) return { missing: 1 };

    const service = repo.services[0];

    if (!service) {
      console.warn("Multiple services found in this repo but none match the repoGroup");
      return { missing: 1 };
    }

    const denominator = Object.keys(service["quality-gates"]).length;

    const numerator = Object.values(service["quality-gates"]).reduce((acc, gates) => {
      const change = gates.find((gate) => gate.gates.length > 0) ? 1 : 0;
      return acc + change;
    }, 0);

    return { missing: 0, numerator, denominator };
  });

  return repoScores.reduce(
    (acc, repoScore) => {
      if (repoScore.missing) {
        return {
          ...acc,
          missing: acc.missing + repoScore.missing,
        };
      }

      if (!acc.denominator) {
        return {
          ...repoScore,
          missing: acc.missing + repoScore.missing,
        };
      }

      const existingScore = acc.numerator / acc.denominator;
      const currentScore = repoScore?.numerator / repoScore?.denominator;
      if (currentScore > existingScore || (currentScore === existingScore && repoScore.denominator > acc.denominator)) {
        return {
          ...repoScore,
          missing: acc.missing + repoScore.missing,
        };
      }
      return {
        ...acc,
        missing: acc.missing + repoScore.missing,
      };
    },
    { missing: 0, numerator: 0, denominator: 0 },
  );
};

const stripExternalServices = (repoGroup: string, repos: TQualityGateOutput[]) => {
  return repos.map((repo) => {
    return {
      ...repo,
      services:
        repo.services.length === 1
          ? repo.services
          : repo.services.filter((service) => service["service-tag"] === repoGroup),
    };
  });
};

const getRepoGroupQualityGates = async (workload: Workload, repoGroup: string): Promise<TRepoGroupQualityGates> => {
  const groupRepoNames = await getReposForWorkloadId([repoGroup], workload.id);

  const repos = await Promise.all(groupRepoNames.map(async (repoName) => getQualityGate(workload, repoName)));

  const reposWithRelevantServices = stripExternalServices(repoGroup, repos);

  const headlineResult = getWorstNumeratorAndDenominator(repoGroup, reposWithRelevantServices);

  const variant = getVariant(headlineResult.numerator, headlineResult.denominator);

  return {
    headline: {
      denominator: headlineResult.denominator,
      missing: headlineResult.missing,
      numerator: headlineResult.numerator,
      variant,
    },
    repos: reposWithRelevantServices,
    repoGroup,
    workloadId: workload.id,
  };
};

const getWorkloadQualityGates = async (workloadId: string, repoGroups?: string[]): Promise<TWorkloadQualityGates | undefined> => {
  const workload = getWorkloadById(workloadId);
  if (!workload) {
    warn(`Could not find workload with team ID: ${workload.id}`);
    return;
  }

  const localRepoGroups = repoGroups?.length ? repoGroups : listRepoGroups(workload);

  return {
    workloadId,
    repoGroups: await Promise.all(
      localRepoGroups.map(async (repoGroup) => getRepoGroupQualityGates(workload, repoGroup)),
    ),
  };
};

export const getQualityGates = async (
  requestWorkloadIds: string[],
  repoGroups?: string[],
): Promise<TWorkloadQualityGates[]> => {
  const workloadIds = requestWorkloadIds.length ? requestWorkloadIds : listWorkloadIds();

  const qualityGates = await Promise.all(
    workloadIds.map((workloadId) => getWorkloadQualityGates(workloadId, repoGroups)),
  );

  // Filter out undefined results (when workload is not found)
  const validQualityGates = qualityGates.filter((qg): qg is TWorkloadQualityGates => qg !== undefined);

  verbose(`Quality gate report:`, validQualityGates);
  return validQualityGates;
};
