import axios from "@/utils/axios";
import { truncateDateOnly } from "@/utils/date";
import { type EnrichedRepoChange } from "@/model/vcs";
import { REPO_CHANGES, REPO_CHANGES_SUMMARY } from "@/utils/urls";

export type ChangeRow = EnrichedRepoChange & {
  key: string;
  commits: {
    id?: string;
    link?: string;
  }[];
  title?: string;
  id?: string;
  type?: string;
  link?: string;
};

export async function fetchForDateRange(
  workloads: string[],
  repoGroups: string[],
  startDate: Date,
  endDate: Date,
): Promise<ChangeRow[]> {
  const response = await axios.get(REPO_CHANGES, {
    params: {
      workloads: workloads.join(","),
      repoGroups: repoGroups.join(","),
      startDate: truncateDateOnly(startDate),
      endDate: truncateDateOnly(endDate),
    },
  });

  const json: EnrichedRepoChange[] = response.data;

  const changes = json.map((change) => {
    const row: ChangeRow = {
      ...change,
      key: `${change.repo}_${change.commitId}`,
      commits: [
        {
          id: shortenCommitId(change.commitId),
          link: change.links.commitLink,
        },
      ],
    };

    if (change.links.issueId) {
      row.id = change.links.issueId;
      row.type = change.links.issueType;
      row.link = change.links.issueLink;
      row.title = change.links.issueTitle;
    } else {
      const prLink = change.links.prLink;
      if (prLink) {
        row.id = `PR #${prLink.substring(prLink.lastIndexOf("/") + 1)}`;
        row.type = "PR";
        row.link = prLink;
        row.title = change.links.prTitle;
      } else {
        row.id = shortenCommitId(change.commitId);
        row.type = "Commit";
        row.link = change.links.commitLink;
        row.title = change.message;
      }
    }
    return row;
  });
  console.log(`${changes.length} changes from ${startDate.toISOString()} to ${endDate.toISOString()}`, changes);
  return changes;
}

function shortenCommitId(commitId: string) {
  return commitId.substring(0, 7);
}

export type ChangesSummaryResponse = {
  summary: string;
};

export async function fetchSummary(
  workloads: string[],
  repoGroups: string[],
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const response = await axios.get<ChangesSummaryResponse>(REPO_CHANGES_SUMMARY, {
    params: {
      workloads: workloads.join(","),
      repoGroups: repoGroups.join(","),
      startDate: truncateDateOnly(startDate),
      endDate: truncateDateOnly(endDate),
    },
  });

  return response.data.summary;
}
