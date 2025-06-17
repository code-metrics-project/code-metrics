import { LightweightSarif, SarifResultLevel, SarifRun, Severity, Vulnerability } from "../../model/vulnerabilities";
import { listWorkloadIds } from "../../config/configMapping";
import { logger, warn } from "../../utils/logger/logger";
import { provideDatastore } from "../../db/factory";
import { DatastoreCollection } from "../../db/api";
import { truncateDateOnly, walkDateRange } from "../../utils/date";
import { getReposForWorkloadId } from "../../utils/repos";

const VULN_COLLECTION_NAME = "vulns";

type VulnKey = {
  date: string;
  workloadId: string;
  repoName: string;
};

type VulnRecord = VulnKey & {
  vulns: Vulnerability[];
};

const getStore = () => provideDatastore<VulnKey, DatastoreCollection>("vulnerabilities", { persistentStore: true });

export const fetchVulnerabilitiesWithArgs = async (
  workloads: string[],
  startDate: Date,
  repoGroups: string[],
): Promise<Record<string, Vulnerability[]>> => {
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  const endDate = new Date();
  const workloadVulns: Record<string, Vulnerability[]> = {};
  const store = getStore();

  let vulnCount = 0;

  await walkDateRange(startDate, endDate, async (current) => {
    for (const workloadId of workloads) {
      const repoNames = await getReposForWorkloadId(repoGroups, workloadId);

      const allVulns: Vulnerability[] = workloadVulns[workloadId] ?? [];
      for (const repoName of repoNames) {
        const key = buildKey(current, workloadId, repoName);
        const vulns: VulnRecord | null = await store.connect(VULN_COLLECTION_NAME, async (col) => {
          return (await col.findOne(key)) as VulnRecord;
        });
        if (vulns) {
          allVulns.push(...vulns.vulns);
        }
      }
      vulnCount += allVulns.length;
      logger(`Retrieved ${allVulns.length} vulnerability results for ${workloadId} on ${current}`);
      workloadVulns[workloadId] = allVulns;
    }
  });

  logger(`Retrieved ${vulnCount} vulnerability results for ${workloads}`);
  return workloadVulns;
};

export function extractRepoName(run: SarifRun): string | null {
  const repoNames = run.versionControlProvenance
    ?.filter((vcp) => {
      return vcp.repositoryUri?.length;
    })
    ?.map((vcp) => {
      const repo = vcp.repositoryUri.substring(vcp.repositoryUri.lastIndexOf("/") + 1);
      return repo.replaceAll(".git", "");
    });
  return repoNames.length ? repoNames[0] : null;
}

export const persistVulnerabilitiesForWorkload = async (
  workloadId: string,
  repoName: string | null,
  reportDate: Date,
  sarif: LightweightSarif,
) => {
  logger(`Persisting vulnerability results for workload ${workloadId} for ${reportDate}`);

  let vulnCount = 0;

  const store = getStore();
  await store.connect(VULN_COLLECTION_NAME, async (col) => {
    const vulns: Vulnerability[] = sarif.runs.flatMap((run) => {
      logger(`Parsing SARIF run for tool: ${run.tool.driver.name} with ${run.results.length} results`);
      const repositoryName = repoName ?? extractRepoName(run);
      if (!repositoryName) {
        warn(`No repository name specified for run and no repositoryUri found in SARIF - ignoring run`);
        return [];
      }

      return run.results.map((result) => {
        return <Vulnerability>{
          repoName: repositoryName,
          raised: reportDate,
          severity: convertSeverity(result.level),
          message: result.id ?? result.message,
        };
      });
    });
    vulnCount += vulns.length;

    const key = buildKey(reportDate, workloadId, repoName);
    const value = <VulnRecord>{
      ...key,
      vulns,
    };
    await col.insertOne(key, value);
  });

  logger(`Persisted ${vulnCount} vulnerability results for workload ${workloadId} for ${reportDate}`);
};

function convertSeverity(level: SarifResultLevel): Severity | null {
  switch (level) {
    case "note":
      return Severity.Low;
    case "warning":
      return Severity.Medium;
    case "error":
      return Severity.Critical;

    case "none":
    default:
      return null;
  }
}

function buildKey(reportDate: Date, workloadId: string, repoName: string) {
  return <VulnKey>{
    date: truncateDateOnly(reportDate),
    workloadId,
    repoName,
  };
}
