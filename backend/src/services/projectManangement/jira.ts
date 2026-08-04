import { JiraTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { JiraTicketService } from "../tickets/jira/service";
import { WorkloadTicketConfigJira } from "../../model/config/workload-config";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { AuthMethod, RemoteServer, TicketManagementServer } from "../../model/config/remote-config";
import { registerTicketConnectionChecker } from "../tickets/ticketService";

const DEFAULT_BUG_TYPES = ["Bug"];

class JiraConfigManager extends AbstractIssueMgmtConfigManager<WorkloadTicketConfigJira, JiraTicketOptions> {
  getDefaultTicketTypes(): string[] {
    return DEFAULT_BUG_TYPES;
  }
}

/**
 * Check connectivity to Jira by calling the serverInfo endpoint.
 */
const checkJiraConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const ticketServer = server as TicketManagementServer;
  const url = ticketServer.url;

  if (!url) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.JIRA,
      status: "unconfigured",
      statusDetail: "No URL configured for this server",
    };
  }

  if (!ticketServer.apiKey) {
    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.JIRA,
      url,
      status: "unconfigured",
      statusDetail: "No API key configured",
    };
  }

  try {
    let authHeader: string;
    if (ticketServer.authMethod === AuthMethod.BEARER_TOKEN) {
      authHeader = `Bearer ${ticketServer.apiKey}`;
    } else {
      const encodedAuth = Buffer.from(`${ticketServer.email || ""}:${ticketServer.apiKey}`).toString("base64");
      authHeader = `Basic ${encodedAuth}`;
    }

    const response = await fetch(`${url}/rest/api/2/serverInfo`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.JIRA,
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
        type: TicketManagementTypes.JIRA,
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
        type: TicketManagementTypes.JIRA,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.JIRA,
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
      type: TicketManagementTypes.JIRA,
      url,
      status: "unreachable",
      statusDetail: err.name || err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initJiraIssues = () => {
  registerIssueMgmt(TicketManagementTypes.JIRA, () => {
    return new JiraTicketService(new JiraConfigManager());
  });
  registerTicketConnectionChecker(TicketManagementTypes.JIRA, checkJiraConnection);
};
