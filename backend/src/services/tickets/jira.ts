import fetch from "node-fetch";
import { limitConcurrency } from "../../utils/retry";
import { logResponseBody } from "../../utils/responses";
import { getAllIssueManagementUrls, getWorkloadById, } from "../../config/configMapping";
import { JiraTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { TicketConfigManager, TicketService, TimeRangeMode } from "./ticketService";
import { LightweightIssue } from "../../model/tickets";
import { provideDatastore } from "../../db/factory";
import { parseInt } from "lodash";
import { Datastore, DatastoreCollection } from "../../db/api";
import { truncateDateOnly } from "../../utils/date";
import { AuthMethod, TicketManagementServer } from "../../model/config/remote-config";
import { Workload, WorkloadId, WorkloadTicketConfigJira } from "../../model/config/workload-config";
import Bottleneck from "bottleneck";

const MAX_RESULTS_PER_QUERY = 100;
const EXPIRY_SECONDS: number = process.env.EXPIRY_SECONDS ? parseInt(process.env.EXPIRY_SECONDS) : 3600;
const COLLECTION_NAME_ISSUES = "issues";
const ISSUE_PATTERN = /([A-Z][A-Z0-9]{1,4}-\d{1,6})/;

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

type JiraConfigManager = TicketConfigManager<WorkloadTicketConfigJira, JiraTicketOptions>;

export class JiraTicketService implements TicketService {
  private configManager: JiraConfigManager;
  private cache: Datastore<{ workload: string; key: string }, DatastoreCollection>;

  constructor(configManager: JiraConfigManager) {
    this.configManager = configManager;
    this.cache = provideDatastore("jira", {
      expireAfterSeconds: EXPIRY_SECONDS,
    });
  }

  fetchTickets = async (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date | null,
    priority: string,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]> => {
    const workload = getWorkloadById(workloadId);
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);

    const teamFilter = ticketManagement?.teamFilterQuery
      ? `AND ${ticketManagement.teamFilterQuery}`
      : "";
    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    const priorityClause = priority ? `AND priority >= ${priority}` : "";
    const issueTypeClause = `AND issuetype in (${issueTypes})`;

    const dateFieldName = timeRangeMode === TimeRangeMode.CreatedWithinRange ? "created" : "resolutiondate";
    const endDateClause = endDate ? `AND ${dateFieldName} <= ${truncateDateOnly(endDate)}` : "";
    const dateClause = `AND ${dateFieldName} >= ${truncateDateOnly(startDate)} ${endDateClause}`;

    const jql = `project = ${ticketManagement.projectName} ${teamFilter} ${priorityClause} ${issueTypeClause} ${dateClause}`;
    return this.fetchIssues(workload, jql);
  };

  fetchOpenTickets = async (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string | number,
  ): Promise<LightweightIssue[]> => {
    const workload = getWorkloadById(workloadId);
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);

    const teamFilter = ticketManagement.teamFilterQuery
      ? `AND ${ticketManagement.teamFilterQuery}`
      : "";

    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    const priorityClause = priority ? `AND priority >= ${priority}` : "";
    const issueTypeClause = `AND issuetype in (${issueTypes})`;

    // created before end date and still open (i.e. unresolved) after the start date
    const dateClause = `AND ((created < ${truncateDateOnly(endDate)}) AND (resolutiondate >= ${truncateDateOnly(
      startDate,
    )} OR resolutiondate is EMPTY))`;

    const jql = `project = ${ticketManagement.projectName} ${teamFilter} ${priorityClause} ${issueTypeClause} ${dateClause}`;
    return this.fetchIssues(workload, jql);
  };

  getAllTicketIds = (workload: Workload, daysBack: number): Promise<string[]> => {
    const ticketManagement = this.configManager.getWorkloadConfig(workload.id);
    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    return this.getAllKeys(ticketManagement.projectName, issueTypes, daysBack, workload.id);
  };

  getTicketTypesByWorkloadId = (workloadId: WorkloadId): string[] => {
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    const serverDefaults = this.configManager.getServerDefaults(workloadId);

    if (ticketManagement?.ticketTypes) {
      return ticketManagement.ticketTypes;
    } else if (serverDefaults?.ticketTypes) {
      return serverDefaults.ticketTypes;
    } else {
      return this.configManager.getDefaultTicketTypes();
    }
  };

  formatIssueTypes = (issueTypes: string[]): string => `"${issueTypes.join('","')}"`;

  getTicket = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> => {
    try {
      return await this.cache.findOrInsertOne(COLLECTION_NAME_ISSUES, { workload: workloadId, key: issueId }, () =>
        this.getIssueDetails(workloadId, issueId),
      );
    } catch (e) {
      warn(`Failed to get issue: ${issueId}: ${e.message}`);
      return null;
    }
  };

  matchTicketId(message: string): string | null {
    const matcher: RegExpMatchArray = message?.match(ISSUE_PATTERN);
    return matcher ? matcher[0] : null;
  }

  buildTicketLink = (workloadId: WorkloadId, issueId: string): string =>
    `${getAllIssueManagementUrls()[workloadId]}/browse/${issueId}`;

  /**
   * @param rawJql the query to execute
   * @param workloadId
   * @param fields - limit to improve performance
   */
  // https://<Jira base URL>/rest/api/2/search?jql=project%20%3D%20TEST%20AND%20issuetype%20in%20(Bug)
  private fetchAllIssuesViaAPI = async (rawJql: string, workloadId: WorkloadId, fields: string[] = []) => {
    const jiraServer = this.configManager.getServerConfig(TicketManagementTypes.JIRA, workloadId);
    const jql = jiraServer.filter ? `(${rawJql}) AND ${jiraServer.filter}` : rawJql;
    logger(`Querying Jira ${jiraServer.id} with JQL: ${jql}`);

    const options = this.getRequestOptions(jiraServer);
    let allIssues = [];
    let resultTotal = -1;

    while (resultTotal === -1 || allIssues.length < resultTotal) {
      const url = `${jiraServer.url}/rest/api/2/search?maxResults=${MAX_RESULTS_PER_QUERY}&startAt=${
        allIssues.length
      }&fields=${fields.join(",")}&jql=${jql}`;
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

  private getAllKeys = async (
    project: string,
    issueTypes: string,
    daysBack: number,
    workloadId: WorkloadId,
  ): Promise<string[]> => {
    const jql = `project = ${project} AND issuetype in (${issueTypes}) AND created >= -${daysBack}d`;
    return this.fetchAllIssuesAndMap(jql, workloadId, [], ({ key }) => key);
  };

  private fetchIssues = async (workload: Workload, jql: string): Promise<LightweightIssue[]> => {
    const issues: LightweightIssue[] = [];
    const workloadIssues = await this.fetchAllIssuesAndMap<LightweightIssue>(
      jql,
      workload.id,
      ["summary", "issuetype", "created", "resolutiondate", "priority"],
      (issue) => {
        return this.mapLightweightIssue(issue, workload.id);
      },
    );
    issues.push(...workloadIssues);
    return issues;
  };

  private fetchAllIssuesAndMap = async <T>(
    jql: string,
    workloadId: WorkloadId,
    fields: string[],
    mapFn: (issue) => T,
  ): Promise<T[]> => {
    console.info(`Fetching Jira issues for ${workloadId}...`);
    try {
      const allIssues = await this.fetchAllIssuesViaAPI(jql, workloadId, fields);
      logger(`${allIssues.length} total Jira issues retrieved`);
      return allIssues.map(mapFn);
    } catch (err) {
      throw new Error(`Jira error with JQL: ${jql} - error: ${err}`);
    }
  };

  private mapLightweightIssue = (issue, workloadId: string): LightweightIssue => {
    return {
      key: issue.key,
      issueType: issue.fields.issuetype?.name,
      created: issue.fields.created,
      resolutiondate: issue.fields.resolutiondate,
      priority: issue.fields.priority?.name,
      title: issue.fields.summary,
      workload: workloadId,
    };
  };

  private getIssueDetails = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> => {
    const issues = await this.fetchAllIssuesViaAPI(`key = ${issueId}`, workloadId, [
      "summary",
      "issuetype",
      "created",
      "resolutiondate",
      "priority",
    ]);
    if (issues.length > 0) {
      const issue = issues[0];
      return this.mapLightweightIssue(issue, workloadId);
    }
    return null;
  };

  matchTicketByIdAndRetrieve = async (message: string | null, workloadId: WorkloadId): Promise<LightweightIssue | null> => {
    const issueId = this.matchTicketId(message);
    if (!issueId) {
      return null;
    }
    const issue = await this.getTicket(workloadId, issueId);
    if (issue) {
      return issue;
    } else {
      verbose(`Failed to retrieve ${issueId} - assuming invalid issue`);
      return null;
    }
  };
}
