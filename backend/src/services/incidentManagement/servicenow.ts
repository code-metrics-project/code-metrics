import {ServiceNowTicketOptions, TicketManagementTypes} from "../../model/config/common";
import { ServiceNowTicketService } from "../tickets/servicenow";
import { AbstractIncidentMgmtConfigManager, registerIncidentMgmt } from "./incidentMgmtService";
import { WorkloadTicketConfigServiceNow } from "../../model/config/workload-config";

const DEFAULT_INCIDENT_TABLE_NAME = "incident";

class ServiceNowConfigManager extends AbstractIncidentMgmtConfigManager<WorkloadTicketConfigServiceNow, ServiceNowTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return [DEFAULT_INCIDENT_TABLE_NAME];
  }
}

export const initServiceNowIncidents = () => registerIncidentMgmt(TicketManagementTypes.SERVICENOW, () => {
  return new ServiceNowTicketService(new ServiceNowConfigManager());
});
