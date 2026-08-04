import { IssueWithPRCount, PREvent, PREventDetail, PRWithIssueCount } from "../../model/vcs";
import { getWorkloadById } from "../../config/configMapping";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getReposForWorkloadId } from "../../utils/repos";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { vcsLimiter } from "./vcs-limiter";
import { truncateDateOnly } from "../../utils/date";

export const vcsPROpenTimeWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<PREvent[]> => {
  const prMetrics: Promise<PREvent[]>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for PR open duration for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const metrics = vcsLimiter.schedule(() =>
        vcs.getPROpenTimeFromRepo(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        ),
      );
      prMetrics.push(metrics);
    }
  }

  const result: PREvent[] = (await Promise.all(prMetrics)).flat();

  verbose(`PR open time report:`, result);
  return result;
};

export const vcsPRSizeWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<PREventDetail[]> => {
  const prMetrics: Promise<PREventDetail[]>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for PR open duration for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const metrics = vcsLimiter.schedule(() =>
        vcs.getPRSizeFromRepo(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        ),
      );
      prMetrics.push(metrics);
    }
  }

  const result: PREventDetail[] = (await Promise.all(prMetrics)).flat();

  verbose(`PR open time report:`, result);
  return result;
};

const ISSUE_KEY_REGEX = /([A-Z]+-\d+)/g;

const extractIssueIds = (title: string): string[] => {
  if (!title) return [];
  const matches = title.match(ISSUE_KEY_REGEX) ?? [];
  return [...new Set(matches)];
};

const getPrDay = (createdDate: string | undefined, fallbackDate: string): string => {
  if (!createdDate) return fallbackDate;
  return truncateDateOnly(new Date(createdDate));
};

export const vcsPRsPerIssueWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<IssueWithPRCount[]> => {
  const metrics: Promise<IssueWithPRCount | null>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for PRs-per-issue for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const scheduled = vcsLimiter.schedule(async () => {
        const prs = await vcs.getPRsInDateRange(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        );

        const perDateIssue = new Map<string, { date: string; issueId: string; prCount: number }>();

        prs.forEach((prInfo) => {
          const day = getPrDay(prInfo.pr.createdDate, startDate);
          const issueIds = extractIssueIds(prInfo.pr.title);
          issueIds.forEach((issueId) => {
            const key = `${day}|${issueId}`;
            const current = perDateIssue.get(key) ?? { date: day, issueId, prCount: 0 };
            current.prCount += 1;
            perDateIssue.set(key, current);
          });
        });

        const changes = [...perDateIssue.values()].map((entry) => ({
          date: entry.date,
          issueId: entry.issueId,
          prCount: entry.prCount,
          prIds: [],
        }));

        if (changes.length === 0) {
          return null;
        }

        return {
          workloadId,
          projectName: workload.codeManagement.projectName,
          repositoryName: teamProjectKey,
          changes,
        };
      });
      metrics.push(scheduled);
    }
  }

  const all = await Promise.all(metrics);
  const result = all.filter((entry): entry is IssueWithPRCount => !!entry);
  verbose(`PRs-per-issue report:`, result);
  return result;
};

export const vcsIssuesPerPRWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<PRWithIssueCount[]> => {
  const metrics: Promise<PRWithIssueCount>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for Issues-per-PR for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const scheduled = vcsLimiter.schedule(async () => {
        const prs = await vcs.getPRsInDateRange(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        );

        const changes = prs.map((prInfo) => {
          const issueIds = extractIssueIds(prInfo.pr.title);
          return {
            date: getPrDay(prInfo.pr.createdDate, startDate),
            prId: String(prInfo.pr.id),
            issueCount: issueIds.length,
            issueIds,
          };
        });

        return {
          workloadId,
          projectName: workload.codeManagement.projectName,
          repositoryName: teamProjectKey,
          changes,
        };
      });
      metrics.push(scheduled);
    }
  }

  const result: PRWithIssueCount[] = await Promise.all(metrics);
  verbose(`Issues-per-PR report:`, result);
  return result;
};
