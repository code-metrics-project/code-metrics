import { verbose } from "../../utils/logger/logger";
import {
  TicketManagementTypes,


} from "../../model/config/common";
import { getServerConfig, getWorkloadById } from "../../config/configMapping";
import { getConfig } from "../../config/config";
import { TicketConfigManager, TicketService } from "../tickets/ticketService";
import { TicketManagementServer } from "../../model/config/remote-config";
import { Workload, WorkloadId, WorkloadTicketConfig } from "../../model/config/workload-config";

export type IssueMgmtService = TicketService;

const builders: Record<string, () => IssueMgmtService> = {};
const instances: Record<string, IssueMgmtService> = {};

export const registerIssueMgmt = (type: TicketManagementTypes, builder: () => IssueMgmtService) => {
  verbose(`Registered issue management implementation for: ${type}`);
  builders[type] = builder;
};

export const getIssueMgmtForWorkload = (workload: Workload): IssueMgmtService =>
  getIssueMgmt(workload.projectManagement.type);

const getIssueMgmt = (type: string): IssueMgmtService => {
  let instance = instances[type];
  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`No issue management implementation registered for type: ${type}`);
    }
    instance = builder();
    instances[type] = instance;
  }
  return instance;
};

/**
 * Uses the workload's `projectManagement` configuration.
 */
export abstract class AbstractIssueMgmtConfigManager<C extends WorkloadTicketConfig, I> implements TicketConfigManager<C, I> {
  abstract getDefaultTicketTypes(): string[];

  getWorkloadConfig(workloadId: WorkloadId): C {
    const workload = getWorkloadById(workloadId);
    return workload.projectManagement as C;
  }

  getServerDefaults(workloadId: WorkloadId): I {
    const workload = getWorkloadById(workloadId);
    const serverConfig = this.getServerConfig(workload.projectManagement.type, workloadId);
    return serverConfig.defaults as I;
  }

  getServerConfig(serverType: TicketManagementTypes, workloadId: WorkloadId): TicketManagementServer {
    const serverId = this.getWorkloadConfig(workloadId).serverId;
    return getServerConfig(getConfig().remoteConfigs.ticketManagement[serverType]?.servers, serverId)
  }
}
