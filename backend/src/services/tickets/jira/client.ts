import { WorkloadId } from "../../../model/config/workload-config";
import { TicketManagementTypes } from "../../../model/config/common";
import { logger, verbose } from "../../../utils/logger/logger";
import { limitConcurrency } from "../../../utils/retry";
import { logResponseBody } from "../../../utils/responses";
import { AuthMethod, TicketManagementServer } from "../../../model/config/remote-config";
import Bottleneck from "bottleneck";
import { JiraConfigManager } from "./service";

const MAX_RESULTS_PER_QUERY = 100;

/**
 * Global limiter to control concurrency across all JiraClient instances.
 * This helps to avoid hitting rate limits when multiple instances are used.
 *
 * Jira Cloud API rate limit is 100 requests per 15 minutes (900 seconds)
 * https://developer.atlassian.com/cloud/jira/platform/rate-limiting/
 */
const limiter = new Bottleneck({
  maxConcurrent: 4,
});

export type JiraClient = {
  fetchAllIssuesViaAPI(rawJql: string, workloadId: WorkloadId, fields?: string[]): Promise<any[]>;
};

export enum JiraClientType {
  REST_API_V2_SEARCH = "rest-api-v2-search",
  REST_API_V3_SEARCH_JQL = "rest-api-v3-search-jql",
}

/**
 * Factory method to create a Jira client based on the specified version.
 * @param configManager
 * @param clientVersion
 */
export function createJiraClient(configManager: any, clientVersion: JiraClientType): JiraClient {
  verbose(`Creating Jira client for version: ${clientVersion}`);
  switch (clientVersion) {
    case JiraClientType.REST_API_V2_SEARCH:
      return new JiraClientRestApiV2Search(configManager);
    case JiraClientType.REST_API_V3_SEARCH_JQL:
      return new JiraClientRestApiV3SearchJql(configManager);
    default:
      throw new Error(`Unsupported Jira client version: ${clientVersion}`);
  }
}

/**
 * Base Jira client.
 */
abstract class AbstractJiraClient implements JiraClient {
  private readonly configManager: JiraConfigManager;
  private readonly apiPath: string;

  protected constructor(configManager: JiraConfigManager, apiPath: string) {
    this.configManager = configManager;
    this.apiPath = apiPath;
  }

  /**
   * @param rawJql the query to execute
   * @param workloadId
   * @param fields - limit to improve performance
   */
  fetchAllIssuesViaAPI = async (rawJql: string, workloadId: WorkloadId, fields: string[] = []) => {
    const jiraServer = this.configManager.getServerConfig(TicketManagementTypes.JIRA, workloadId);
    const jql = jiraServer.filter ? `(${rawJql}) AND ${jiraServer.filter}` : rawJql;
    logger(`Querying Jira ${jiraServer.id} with JQL: ${jql}`);

    const options = this.getRequestOptions(jiraServer);
    let allIssues = [];
    let resultTotal = -1;

    while (resultTotal === -1 || allIssues.length < resultTotal) {
      const url = this.buildUrl(allIssues.length, jql, fields, jiraServer);
      verbose(`Fetching Jira issues from URL`, url);

      const response: any = await limitConcurrency(limiter, async () =>
        fetch(url, options)
          .then((res) => res.json())
          .then((response) => logResponseBody(url, response)),
      );
      if (response.errorMessages) {
        throw new Error(`Failed to query Jira with JQL: ${jql} - error: ${response.errorMessages.join()}`);
      }
      resultTotal = response.total;
      allIssues = [...allIssues, ...response.issues];
      logger(`${allIssues.length} of ${resultTotal} Jira issues retrieved`);
    }

    return allIssues;
  };

  private getRequestOptions = (server: TicketManagementServer) => {
    const options = {
      headers: {},
    };

    switch (server.authMethod) {
      case AuthMethod.BASIC_AUTH: {
        const encodedAuth = Buffer.from(`${server.email}:${server.apiKey}`).toString("base64");
        options.headers["Authorization"] = `Basic ${encodedAuth}`;
        break;
      }
      case AuthMethod.BEARER_TOKEN: {
        options.headers["Authorization"] = `Bearer ${server.apiKey}`;
        break;
      }
      default: {
        throw new Error(`Unsupported auth method: ${server.authMethod}`);
      }
    }

    return options;
  };

  private buildUrl(
    startAt: number,
    jql: string,
    fields: string[],
    jiraServer: TicketManagementServer,
  ) {
    const queryParams = {
      maxResults: MAX_RESULTS_PER_QUERY.toString(),
      startAt: startAt.toString(),
      jql: jql,
    };
    if (fields.length > 0) {
      queryParams["fields"] = fields.join(",");
    }
    // Construct the full URL with query parameters
    // e.g., https://example.atlassian.net/rest/api/2/search?maxResults=100&startAt=0&jql=project=TEST
    // Note: Using URLSearchParams to ensure proper encoding;
    const queryString = new URLSearchParams(queryParams).toString();
    return `${jiraServer.url}${this.apiPath}?${queryString}`;
  }
}

/**
 * Jira client to interact with Jira V2 REST API Search GET endpoint.
 * See https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-get
 *
 * OAuth 2.0 scopes required:
 * - Classic: read:jira-work
 * - Granular: read:issue-details:jira, read:audit-log:jira, read:avatar:jira, read:field-configuration:jira, read:issue-meta:jira
 */
class JiraClientRestApiV2Search extends AbstractJiraClient {
  constructor(configManager: any) {
    super(configManager, "/rest/api/2/search");
  }
}

/**
 * Jira client to interact with Jira V3 REST API Search JQL GET endpoint.
 * See https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
 *
 * OAuth 2.0 scopes required:
 * - Classic: read:jira-work
 * - Granular: read:issue-details:jira, read:audit-log:jira, read:avatar:jira, read:field-configuration:jira, read:issue-meta:jira
 */
class JiraClientRestApiV3SearchJql extends AbstractJiraClient {
  constructor(configManager: JiraConfigManager) {
    super(configManager, "/rest/api/3/search/jql");
  }
}
