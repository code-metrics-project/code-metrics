import { getConfigItemAsNumber } from "../../config/sources/source";
import { TQualityGateOutput } from "../../model/qualityGates";

const qualityGateDangerThreshold = getConfigItemAsNumber("QUALITY_GATE_THRESHOLD_DANGER", 30);
const qualityGateWarningThreshold = getConfigItemAsNumber("GUALITY_GATE_THRESHOLD_WARNING", 80);
export const getVariant = (numerator?: number, denominator?: number): "success" | "warning" | "danger" | "no_data" => {
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
export const getWorstNumeratorAndDenominator = (repoGroup: string, repos: TQualityGateOutput[]) => {
  const repoScores = repos.map((repo) => {
    if (!repo.services) return { missing: 1 };

    const service = repo.services[0];

    if (!service) {
      console.warn(`Multiple services found in repo '${repo.repo}' but none match the repoGroup '${repoGroup}'`);
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
          missing: acc.missing + repoScore.missing
        };
      }

      if (!acc.denominator) {
        return {
          ...repoScore,
          missing: acc.missing + repoScore.missing
        };
      }

      const existingScore = acc.numerator / acc.denominator;
      const currentScore = repoScore?.numerator / repoScore?.denominator;
      if (currentScore > existingScore || (currentScore === existingScore && repoScore.denominator > acc.denominator)) {
        return {
          ...repoScore,
          missing: acc.missing + repoScore.missing
        };
      }
      return {
        ...acc,
        missing: acc.missing + repoScore.missing
      };
    },
    { missing: 0, numerator: 0, denominator: 0 }
  );
};