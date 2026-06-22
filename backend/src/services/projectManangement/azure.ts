import * as azdev from "azure-devops-node-api";
import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { AzureTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AdoTicketService } from "../tickets/azure";
import { WorkloadTicketConfigAzure } from "../../model/config/workload-config";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { RemoteServer, TicketManagementServer } from "../../model/config/remote-config";
import { registerTicketConnectionChecker } from "../tickets/ticketService";

const DEFAULT_BUG_TYPES = ["Bug"];

class AdoConfigManager extends AbstractIssueMgmtConfigManager<WorkloadTicketConfigAzure, AzureTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_BUG_TYPES;
  }
}

/**
 * Check connectivity to Azure DevOps by calling the projects endpoint.
 */
const checkAzureConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const ticketServer = server as TicketManagementServer;
  const url = ticketServer.url;

  if (!url) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.AZURE,
      status: "unconfigured",
      statusDetail: "No URL configured for this server",
    };
  }

  if (!ticketServer.apiKey) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.AZURE,
      url,
      status: "unconfigured",
      statusDetail: "No API key configured",
    };
  }

  try {
    const authHandler = azdev.getPersonalAccessTokenHandler(ticketServer.apiKey);
    const connection = new azdev.WebApi(url, authHandler);
    const coreApi = await connection.getCoreApi();
    await coreApi.getProjects(undefined, 1);

    const responseTimeMs = Date.now() - startTime;

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.AZURE,
      url,
      status: "connected",
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;

    if (err.statusCode === 429) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.AZURE,
        url,
        status: "rateLimited",
        statusDetail: `HTTP 429: ${err.message || "Rate limited"}`,
        responseTimeMs,
      };
    }

    if (err.statusCode === 401 || err.statusCode === 403) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.AZURE,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${err.statusCode}: ${err.message}`,
        responseTimeMs,
      };
    }

    if (err.statusCode && err.statusCode >= 400) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.AZURE,
        url,
        status: "error",
        statusDetail: `HTTP ${err.statusCode}: ${err.message}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.AZURE,
      url,
      status: "unreachable",
      statusDetail: err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initAdoIssues = () => {
  registerIssueMgmt(TicketManagementTypes.AZURE, () => {
    return new AdoTicketService(new AdoConfigManager());
  });
  registerTicketConnectionChecker(TicketManagementTypes.AZURE, checkAzureConnection);
};
