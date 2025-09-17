import { JiraTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AbstractIncidentMgmtConfigManager, registerIncidentMgmt } from "./incidentMgmtService";
import { JiraTicketService } from "../tickets/jira/service";
import { WorkloadTicketConfigJira } from "../../model/config/workload-config";

const DEFAULT_INCIDENT_TYPES = ["Incident"];

class JiraConfigManager extends AbstractIncidentMgmtConfigManager<WorkloadTicketConfigJira, JiraTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_INCIDENT_TYPES;
  }
}

export const initJiraIncidents = () =>
  registerIncidentMgmt(TicketManagementTypes.JIRA, () => {
    return new JiraTicketService(new JiraConfigManager());
  });
