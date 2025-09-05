import { TicketManagementTypes } from "../../model/config/common";
import { getServerConfig, getWorkloadById } from "../../config/configMapping";
import { getConfig } from "../../config/config";
import { verbose } from "../../utils/logger/logger";
import { TicketConfigManager, TicketService } from "../tickets/ticketService";
import { TicketManagementServer } from "../../model/config/remote-config";
import { Workload, WorkloadId, WorkloadTicketConfig } from "../../model/config/workload-config";

export type IncidentMgmtService = TicketService;

const builders: Record<string, () => IncidentMgmtService> = {};
const instances: Record<string, IncidentMgmtService> = {};

export const registerIncidentMgmt = (type: TicketManagementTypes, builder: () => IncidentMgmtService) => {
  verbose(`Registered incident management implementation for: ${type}`);
  builders[type] = builder;
};

export const getIncidentMgmtForWorkload = (workload: Workload): IncidentMgmtService =>
  getIncidentMgmt(workload.incidents.type);

const getIncidentMgmt = (type: string): IncidentMgmtService => {
  let instance = instances[type];
  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`No incident management implementation registered for type: ${type}`);
    }
    instance = builder();
    instances[type] = instance;
  }
  return instance;
};

/**
 * Uses the workload's `incidents` configuration.
 */
export abstract class AbstractIncidentMgmtConfigManager<C extends WorkloadTicketConfig, I>
  implements TicketConfigManager<C, I>
{
  abstract getDefaultTicketTypes(): string[];

  getWorkloadConfig(workloadId: WorkloadId): C {
    const workload = getWorkloadById(workloadId);
    return workload.incidents as C;
  }

  getServerDefaults(workloadId: WorkloadId): I {
    const workload = getWorkloadById(workloadId);
    const serverConfig = this.getServerConfig(workload.incidents.type, workloadId);
    return serverConfig.defaults as I;
  }

  getServerConfig(serverType: TicketManagementTypes, workloadId: WorkloadId): TicketManagementServer {
    const serverId = this.getWorkloadConfig(workloadId).serverId;
    return getServerConfig(getConfig().remoteConfigs.ticketManagement[serverType]?.servers, serverId);
  }
}
