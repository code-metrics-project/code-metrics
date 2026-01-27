import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { GithubTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { GithubTicketService } from "../tickets/github";
import { WorkloadTicketConfigGithub } from "../../model/config/workload-config";

const DEFAULT_BUG_TYPES = ["Bug"];

export class GithubConfigManager extends AbstractIssueMgmtConfigManager<
  WorkloadTicketConfigGithub,
  GithubTicketOptions
> {
  getDefaultTicketTypes = (): string[] => DEFAULT_BUG_TYPES;
}

export const initGithubIssues = () =>
  registerIssueMgmt(TicketManagementTypes.GITHUB, () => new GithubTicketService(new GithubConfigManager()));
