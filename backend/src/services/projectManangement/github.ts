import { Octokit } from "@octokit/rest";
import { AbstractIssueMgmtConfigManager, registerIssueMgmt } from "./issueMgmtService";
import { GithubTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { GithubTicketService } from "../tickets/github";
import { WorkloadTicketConfigGithub } from "../../model/config/workload-config";
import { ConnectionCheckResult } from "../../model/remote-connection-status";
import { AuthMethod, RemoteServer, TicketManagementServer } from "../../model/config/remote-config";
import { registerTicketConnectionChecker } from "../tickets/ticketService";
import { createGitHubAppOctokit } from "../auth/github-app";

const DEFAULT_BUG_TYPES = ["Bug"];

export class GithubConfigManager extends AbstractIssueMgmtConfigManager<
  WorkloadTicketConfigGithub,
  GithubTicketOptions
> {
  getDefaultTicketTypes = (): string[] => DEFAULT_BUG_TYPES;
}

/**
 * Check connectivity to GitHub by calling the rate limit endpoint.
 */
const checkGithubConnection = async (server: RemoteServer): Promise<ConnectionCheckResult> => {
  const startTime = Date.now();
  const ticketServer = server as TicketManagementServer;
  const url = ticketServer.url || "https://api.github.com";

  try {
    let octokit: Octokit;
    if (ticketServer.authMethod === AuthMethod.GITHUB_APP && ticketServer.githubApp) {
      octokit = createGitHubAppOctokit(ticketServer.githubApp, url);
    } else {
      octokit = new Octokit({
        auth: ticketServer.apiKey,
        baseUrl: url,
        request: { timeout: 5000 },
      });
    }

    const rateLimitResponse = await octokit.rest.rateLimit.get();

    // Check if rate limit has been reached
    const coreRateLimit = rateLimitResponse.data.resources.core;
    if (coreRateLimit.remaining === 0) {
      const resetDate = new Date(coreRateLimit.reset * 1000);
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.GITHUB,
        url,
        status: "rateLimited",
        statusDetail: `Rate limit reached (${coreRateLimit.limit} requests). Resets at ${resetDate.toISOString()}`,
        responseTimeMs: Date.now() - startTime,
      };
    }

    const responseTimeMs = Date.now() - startTime;

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.GITHUB,
      url,
      status: "connected",
      responseTimeMs,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;

    // GitHub returns 403 for both auth errors and rate limit errors
    if (err.status === 403 && err.message && err.message.toLowerCase().includes("rate limit")) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.GITHUB,
        url,
        status: "rateLimited",
        statusDetail: `HTTP 403: ${err.message}`,
        responseTimeMs,
      };
    }

    if (err.status === 401 || err.status === 403) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.GITHUB,
        url,
        status: "unauthorised",
        statusDetail: `HTTP ${err.status}: ${err.message}`,
        responseTimeMs,
      };
    }

    if (err.status && err.status >= 400) {
      return {
        id: server.id,
        category: "ticketManagement",
        type: TicketManagementTypes.GITHUB,
        url,
        status: "error",
        statusDetail: `HTTP ${err.status}: ${err.message}`,
        responseTimeMs,
      };
    }

    return {
      id: server.id,
      category: "ticketManagement",
      type: TicketManagementTypes.GITHUB,
      url,
      status: "unreachable",
      statusDetail: err.code || err.message,
      responseTimeMs,
    };
  }
};

export const initGithubIssues = () => {
  registerIssueMgmt(TicketManagementTypes.GITHUB, () => new GithubTicketService(new GithubConfigManager()));
  registerTicketConnectionChecker(TicketManagementTypes.GITHUB, checkGithubConnection);
};
