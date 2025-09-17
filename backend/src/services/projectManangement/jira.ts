import { JiraTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { JiraTicketService } from "../tickets/jira/service";
import { WorkloadTicketConfigJira } from "../../model/config/workload-config";

const DEFAULT_BUG_TYPES = ["Bug"];

class JiraConfigManager extends AbstractIssueMgmtConfigManager<WorkloadTicketConfigJira, JiraTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_BUG_TYPES;
  }
}

export const initJiraIssues = () =>
  registerIssueMgmt(TicketManagementTypes.JIRA, () => {
    return new JiraTicketService(new JiraConfigManager());
  });
