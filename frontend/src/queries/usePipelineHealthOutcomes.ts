import { useCallback, useState } from "react";
import type { DatedMetrics } from "@/model/metrics";
import type { RawQuery } from "@/model/query";
import { executeQuery } from "@/services/query";
import { outcomeFromResult, splitPipelineRunQueries, type PipelineHealthOutcome } from "./pipelineOutcomes";

export function usePipelineHealthOutcomes() {
  const [outcomes, setOutcomes] = useState<PipelineHealthOutcome[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasExecuted, setHasExecuted] = useState(false);

  const execute = useCallback(async (rawQueries: RawQuery[]) => {
    if (rawQueries.length === 0) {
      return;
    }
    setIsBusy(true);
    setError(null);
    setOutcomes([]);
    try {
      const queries = splitPipelineRunQueries(rawQueries[0].args);
      const results = await Promise.all(queries.map((query) => executeQuery(query)));
      const nextOutcomes: PipelineHealthOutcome[] = [];
      for (let i = 0; i < queries.length; i++) {
        const { workloads, jobGroups, branchNames, stageId, startDate, endDate } = queries[i].args;
        const outcome = outcomeFromResult(
          (workloads as string[])[0],
          (jobGroups as string[])[0],
          results[i] as Map<string, DatedMetrics> | undefined,
          {
            stageId: (stageId as string | undefined) ?? null,
            branchName: Array.isArray(branchNames) && branchNames.length > 0 ? (branchNames as string[])[0] : null,
            startDate: (startDate as string | undefined) ?? null,
            endDate: (endDate as string | undefined) ?? null,
          }
        );
        if (outcome) {
          nextOutcomes.push(outcome);
        }
      }
      setOutcomes(nextOutcomes);
      setHasExecuted(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { outcomes, isBusy, error, hasExecuted, execute };
}
