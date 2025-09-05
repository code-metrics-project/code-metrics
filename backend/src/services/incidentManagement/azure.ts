import { AzureTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AbstractIncidentMgmtConfigManager, registerIncidentMgmt } from "./incidentMgmtService";
import { AdoTicketService } from "../tickets/azure";
import { WorkloadTicketConfigAzure } from "../../model/config/workload-config";

const DEFAULT_INCIDENT_TYPES = ["Issue"];

class AdoConfigManager extends AbstractIncidentMgmtConfigManager<WorkloadTicketConfigAzure, AzureTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_INCIDENT_TYPES;
  }
}

export const initAdoIncidents = () =>
  registerIncidentMgmt(TicketManagementTypes.AZURE, () => {
    return new AdoTicketService(new AdoConfigManager());
  });
