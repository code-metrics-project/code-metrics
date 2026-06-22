import fetch from "node-fetch";
import { ServiceNowTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { ServiceNowTicketService } from "../tickets/servicenow";
import { AbstractIncidentMgmtConfigManager, registerIncidentMgmt } from "./incidentMgmtService";
import { WorkloadTicketConfigServiceNow } from "../../model/config/workload-config";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { AuthMethod, RemoteServer, TicketManagementServer } from "../../model/config/remote-config";
import { registerTicketConnectionChecker } from "../tickets/ticketService";

const DEFAULT_INCIDENT_TABLE_NAME = "incident";

class ServiceNowConfigManager extends AbstractIncidentMgmtConfigManager<
  WorkloadTicketConfigServiceNow,
  ServiceNowTicketOptions
> {
  getDefaultTicketTypes(): string[] {
    return [DEFAULT_INCIDENT_TABLE_NAME];
  }
}

/**
 * Check connectivity to ServiceNow by calling the sys_properties table.
 */
const checkServiceNowConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const ticketServer = server as TicketManagementServer;
  const url = ticketServer.url;

  if (!url) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.SERVICENOW,
      status: "unconfigured",
      statusDetail: "No URL configured for this server",
    };
  }

  if (!ticketServer.apiKey) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.SERVICENOW,
      url,
      status: "unconfigured",
      statusDetail: "No API key configured",
    };
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    switch (ticketServer.authMethod) {
      case AuthMethod.BASIC_AUTH: {
        const encodedAuth = Buffer.from(`${ticketServer.email || ""}:${ticketServer.apiKey}`).toString("base64");
        headers["Authorization"] = `Basic ${encodedAuth}`;
        break;
      }
      case AuthMethod.BEARER_TOKEN: {
        headers["Authorization"] = `Bearer ${ticketServer.apiKey}`;
        break;
      }
      case AuthMethod.CUSTOM: {
        headers["x-sn-apikey"] = ticketServer.apiKey;
        break;
      }
    }

    const response = await fetch(`${url}/api/now/table/sys_properties?sysparm_limit=1`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.SERVICENOW,
        url,
        status: "connected",
        responseTimeMs,
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const detail = retryAfter ? `Rate limited. Retry after ${retryAfter} seconds` : "Rate limited";
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.SERVICENOW,
        url,
        status: "rateLimited",
        statusDetail: detail,
        responseTimeMs,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.SERVICENOW,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.SERVICENOW,
      url,
      status: "error",
      statusDetail: `HTTP ${response.status}: ${response.statusText}`,
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.SERVICENOW,
      url,
      status: "unreachable",
      statusDetail: err.name || err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initServiceNowIncidents = () => {
  registerIncidentMgmt(TicketManagementTypes.SERVICENOW, () => {
    return new ServiceNowTicketService(new ServiceNowConfigManager());
  });
  registerTicketConnectionChecker(TicketManagementTypes.SERVICENOW, checkServiceNowConnection);
};
