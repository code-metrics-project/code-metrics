import { FileCouplingPair, TemporalCouplingData } from "../../model/temporalCoupling";
import { CompletePrInfo } from "../../model/vcs";
import { logger } from "../../utils/logger/logger";
import { WorkloadId, SoftwareComponent } from "../../model/config/workload-config";

const DEFAULT_THRESHOLD = 3;

export const findTemporalCouplingFromPRs = (
  prs: CompletePrInfo[],
  threshold: number = DEFAULT_THRESHOLD,
): FileCouplingPair[] => {
  logger(`Analyzing temporal coupling for ${prs.length} PRs with threshold ${threshold}`);

  const coOccurrence = new Map<string, Map<string, number>>();

  for (const pr of prs) {
    const files = Array.from(new Set(pr.filesChanged.map((f) => f.path)));

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const [fileA, fileB] = files[i] < files[j] ? [files[i], files[j]] : [files[j], files[i]];

        if (!fileA.includes(".") || !fileB.includes(".")) continue;

        if (!coOccurrence.has(fileA)) {
          coOccurrence.set(fileA, new Map());
        }
        const fileAMap = coOccurrence.get(fileA)!;
        fileAMap.set(fileB, (fileAMap.get(fileB) || 0) + 1);
      }
    }
  }

  const couplingPairs: FileCouplingPair[] = [];
  const totalPRs = prs.length;

  for (const [fileA, fileBMap] of coOccurrence.entries()) {
    for (const [fileB, count] of fileBMap.entries()) {
      if (count >= threshold) {
        couplingPairs.push({
          fileA,
          fileB,
          coChangeCount: count,
          percentage: totalPRs > 0 ? (count / totalPRs) * 100 : 0,
        });
      }
    }
  }

  couplingPairs.sort((a, b) => b.coChangeCount - a.coChangeCount);

  logger(`Found ${couplingPairs.length} coupling pairs above threshold ${threshold}`);
  return couplingPairs;
};

export const findTemporalCouplingForComponent = (
  prs: CompletePrInfo[],
  component: SoftwareComponent,
  workloadId: WorkloadId,
  threshold: number = DEFAULT_THRESHOLD,
): TemporalCouplingData => {
  logger(`Finding temporal coupling for ${workloadId}/${component.name}`);

  const couplingPairs = findTemporalCouplingFromPRs(prs, threshold);

  return {
    workloadId,
    componentName: component.name,
    repoName: component.repo,
    totalCommits: prs.length,
    couplingPairs,
  };
};