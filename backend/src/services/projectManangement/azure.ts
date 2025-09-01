import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { AzureTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AdoTicketService } from "../tickets/azure";
import { WorkloadTicketConfigAzure } from "../../model/config/workload-config";

const DEFAULT_BUG_TYPES = ["Bug"];

class AdoConfigManager extends AbstractIssueMgmtConfigManager<WorkloadTicketConfigAzure, AzureTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_BUG_TYPES;
  }
}

export const initAdoIssues = () =>
  registerIssueMgmt(TicketManagementTypes.AZURE, () => {
    return new AdoTicketService(new AdoConfigManager());
  });
