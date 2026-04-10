import { TGate, TMergeRules, TQualityGate, TQualityGateManifest, TQualityGateOutput } from "../../model/qualityGates";
import { error } from "../../utils/logger/logger";
import { QualityGatesConfig } from "../../model/config/quality-gates-config";
import { VcsService } from "../codeManagement/vcsService";

export function parseManifest(file: string) {
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
  vcs: VcsService,
  workloadId: string,
  repo: string,
  repoLink: string,
  manifest: TQualityGateManifest,
  rules: TMergeRules[],
  qualityGatesConfig: QualityGatesConfig,
): TQualityGateOutput {
  /**
   * Github uses the job name as the only connection point between a workflow and a required status check
   * which means this is the only tool we can use to check if a job is actually required pre-merge.
   * This has obvious implications if two workflows have jobs with the same name. This is a known issue
   * with Github: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#about-branch-protection-rules
   */
  manifest.services.forEach((service) => {
    service["quality-gates"].forEach((qualityGate) => {
      qualityGate.config.fileURL = vcs.buildFileLink(workloadId, repo, "main", qualityGate.config.file);

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
