// see https://confluence.atlassian.com/adminjiraserver/changing-the-project-key-format-938847081.html for format
import { VcsService } from "../services/codeManagement/vcsService";
import { ChangeLinks, RepoChange } from "../model/vcs";
import { logger, verbose } from "./logger/logger";
import { IssueMgmtService } from "../services/projectManangement/issueMgmtService";
import { WorkloadId } from "../model/config/workload-config";

/**
 * Find links to issues and PRs for a given commit.
 */
export const discoverLinks = async (
  workloadId: WorkloadId,
  vcsProjectName: string,
  vcs: VcsService,
  issueMgmt: IssueMgmtService,
  change: RepoChange,
): Promise<ChangeLinks> => {
  const links: ChangeLinks = {
    commitLink: vcs.buildCommitLink(change, workloadId, vcsProjectName),
  };
  let issue = await issueMgmt.matchTicketByIdAndRetrieve(change.message, workloadId);

  const pr = await vcs.getPRForCommit(workloadId, vcsProjectName, change.repo, change.commitId);

  if (pr) {
    verbose(`Found PR #${pr.id} for commit ${change.commitId}`);
    links.prTitle = pr.title;
    links.prLink = pr.url ?? vcs.buildPRLink(change, pr, workloadId);

    if (!issue) {
      issue =
        (await issueMgmt.matchTicketByIdAndRetrieve(pr.title, workloadId)) ??
        (await issueMgmt.matchTicketByIdAndRetrieve(pr.message, workloadId));
      if (issue) {
        logger(`Found issue ${issue.key} in referenced PR #${pr.id}`);
      } else {
        issue = await issueMgmt.matchTicketByIdAndRetrieve(pr.sourceBranch, workloadId);
        if (issue) {
          logger(`Found issue ${issue.key} in PR branch name: ${pr.sourceBranch}`);
        }
      }
    }
  }

  if (issue) {
    links.issueId = issue.key;
    links.issueType = issue.issueType;
    links.issueTitle = issue.title;
    links.issueLink = issueMgmt.buildTicketLink(workloadId, links.issueId);
  }

  return links;
};
