import { logger } from "../../utils/logger/logger";
import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { fetchVulnerabilitiesWithArgs } from "../../services/vulnerabilities/vulnerabilities";
import { Severity, Vulnerability } from "../../model/vulnerabilities";
import { truncateDateOnly } from "../../utils/date";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { isMatch } from "lodash";
import { lookupRepoGroupForRepoName } from "../../utils/repos";

export const groupVulnerabilities = (vulns: Record<string, Vulnerability[]>): Map<DateStamp, DatedMetrics> => {
  const workloads = Object.keys(vulns);
  logger(`Processing vulnerabilities for ${workloads.length} workloads`);
  if (workloads.length === 0) {
    return new Map();
  }

  // map of date to workload-grouped vulns
  const grouped = new Map<DateStamp, DatedMetrics>();

  for (const [workloadId, vulnerabilities] of Object.entries(vulns)) {
    for (const v of vulnerabilities) {
      const current = truncateDateOnly(v.raised);

      let axisName = "vulns";
      switch (v.severity) {
        case Severity.Critical:
          axisName += "-critical";
          break;
        case Severity.High:
          axisName += "-high";
          break;
        case Severity.Medium:
          axisName += "-medium";
          break;
        case Severity.Low:
          axisName += "-low";
          break;
        default:
          axisName += "-unknown";
          break;
      }

      const datedMetrics = grouped.get(current) ?? { [axisName]: [] };
      const repoGroup = lookupRepoGroupForRepoName(workloadId, v.repoName);

      const dimensions: MetricItemDimensions = {
        workloadId,
        repoGroup,
        repoName: v.repoName,
      };

      let vulnForWorkload = datedMetrics[axisName].find((m) => isMatch(m.dimensions, dimensions));
      if (!vulnForWorkload) {
        vulnForWorkload = createMetricItem(current, dimensions);
        datedMetrics[axisName].push(vulnForWorkload);
      }

      vulnForWorkload.value++;
      grouped.set(current, datedMetrics);
    }
  }

  return interpolateMissing(grouped, MissingBehaviour.SET_TO_ZERO);
};

export const fetchVulnerabilities = async (
  workloads: string[],
  startDate: string,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching vulnerabilities for workloads: ${workloads} from: ${startDate}`);
  try {
    const result = await fetchVulnerabilitiesWithArgs(workloads, new Date(startDate), repoGroups);

    logger(`Parsing vulnerabilities`);
    return groupVulnerabilities(result);
  } catch (error) {
    throw new Error(`Failed to fetch vulnerabilities: ${error}`);
  }
};
