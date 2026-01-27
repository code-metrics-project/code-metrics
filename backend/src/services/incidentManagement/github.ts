import { GithubTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AbstractIncidentMgmtConfigManager, registerIncidentMgmt } from "./incidentMgmtService";
import { GithubTicketService } from "../tickets/github";
import { WorkloadTicketConfigGithub } from "../../model/config/workload-config";

const DEFAULT_INCIDENT_TYPES = ["Issue"];

class GithubConfigManager extends AbstractIncidentMgmtConfigManager<WorkloadTicketConfigGithub, GithubTicketOptions> {
  getDefaultTicketTypes = (): string[] => DEFAULT_INCIDENT_TYPES;
}

export const initGithubIncidents = () =>
  registerIncidentMgmt(TicketManagementTypes.GITHUB, () => new GithubTicketService(new GithubConfigManager()));
