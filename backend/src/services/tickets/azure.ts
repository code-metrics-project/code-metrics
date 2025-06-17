import { getPersonalAccessTokenHandler, WebApi } from "azure-devops-node-api/WebApi";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";
import { WorkItem, WorkItemQueryResult } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import { Datastore, DatastoreCollection } from "../../db/api";
import { getAllIssueManagementUrls, getWorkloadById, } from "../../config/configMapping";
import { TicketConfigManager, TicketService, TimeRangeMode } from "./ticketService";
import { LightweightIssue } from "../../model/tickets";
import { logger, verbose } from "../../utils/logger/logger";
import { parseInt } from "lodash";
import { provideDatastore } from "../../db/factory";
import { limitConcurrencyAndRetry } from "../../utils/retry";
import { AzureTicketOptions, TicketManagementTypes } from "../../model/config/common";
import { truncateDateOnly } from "../../utils/date";
import { Workload, WorkloadId, WorkloadTicketConfigAzure } from "../../model/config/workload-config";
import Bottleneck from "bottleneck";

const MAX_RESULTS_PER_QUERY = 200;
const EXPIRY_SECONDS: number = process.env.EXPIRY_SECONDS ? parseInt(process.env.EXPIRY_SECONDS) : 3600;
const DEFAULT_ISSUE_PRIORITIES = ["0", "1", "2", "3", "4"];
const ISSUE_PATTERN = /(?<!#)\d+/;

const limiter = new Bottleneck({
  maxConcurrent: 4,
});

type AdoConfigManager = TicketConfigManager<WorkloadTicketConfigAzure, AzureTicketOptions>;

export class AdoTicketService implements TicketService {
  private configManager: AdoConfigManager;
  private cache: Datastore<{ workload: string; key: string }, DatastoreCollection>;
  private connections: Map<string, WebApi>;

  constructor(configManager: AdoConfigManager) {
    this.configManager = configManager;
    this.cache = provideDatastore("ado-issues", {
      expireAfterSeconds: EXPIRY_SECONDS,
    });
    this.connections = new Map<string, WebApi>();
  }

  getConnection = (workloadId: WorkloadId, reset = false): WebApi => {
    let connection: WebApi;
    if (!this.connections.has(workloadId) || reset) {
      const azureServer = this.configManager.getServerConfig(TicketManagementTypes.AZURE, workloadId);

      const authHandler = getPersonalAccessTokenHandler(azureServer.apiKey);
      connection = new WebApi(azureServer.url, authHandler);
      this.connections.set(workloadId, connection);
    } else {
      connection = this.connections.get(workloadId);
    }

    return connection;
  };

  fetchTickets(workloadId: string, startDate: Date, endDate: Date, priority: string, timeRangeMode: TimeRangeMode): Promise<LightweightIssue[]> {
    const workload = getWorkloadById(workloadId);

    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    const issueTypeClause = `Where [System.WorkItemType] IN (${issueTypes})`;
    const priorityClause = priority ? `AND [Microsoft.VSTS.Common.Priority] >= ${this.mapPriority(priority)}` : "";

    const dateFieldName = timeRangeMode === TimeRangeMode.CreatedWithinRange ? "[System.CreatedDate]" : "[Microsoft.VSTS.Common.ResolvedDate]";
    const endDateClause = endDate ? `AND ${dateFieldName} <= '${truncateDateOnly(endDate)}'` : "";
    const dateClause = `AND ${dateFieldName} >= '${startDate.toISOString()}' ${endDateClause}`;

    const wiql = `From WorkItems ${issueTypeClause} ${priorityClause} ${dateClause}`;
    return this.fetchIssues(workload, wiql);
  }

  fetchOpenTickets = (
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string,
  ): Promise<LightweightIssue[]> => {
    const workload = getWorkloadById(workloadId);

    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    const issueTypeClause = `Where [System.WorkItemType] IN (${issueTypes})`;
    const priorityClause = priority ? `AND [Microsoft.VSTS.Common.Priority] >= ${this.mapPriority(priority)}` : "";

    // created before end date and still open (i.e. unresolved) after the start date
    const dateClause = `AND (([System.CreatedDate] < '${endDate.toISOString()}') AND ([Microsoft.VSTS.Common.ResolvedDate] >= '${startDate.toISOString()}' OR [Microsoft.VSTS.Common.ResolvedDate] is EMPTY))`;

    const wiql = `From WorkItems ${issueTypeClause} ${priorityClause} ${dateClause}`;
    return this.fetchIssues(workload, wiql);
  };

  getAllTicketIds = (workload: Workload, daysBack: number): Promise<string[]> => {
    const issueTypes = this.formatIssueTypes(this.getTicketTypesByWorkloadId(workload.id));
    const query = `From WorkItems Where [System.WorkItemType] IN (${issueTypes}) AND [System.CreatedDate] >= @today-${daysBack}`;
    return this.fetchAllIssuesAndMap(query, workload.id, ["System.Id"], ({ id }) => id);
  };

  formatIssueTypes = (issueTypes: string[]): string => `'${issueTypes.join("','")}'`;

  getTicket = async (workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> =>
    this.fetchMappedIssuesDetails([issueId as unknown as number], workloadId)[0];

  /**
   * @param rawWiql the query to execute
   * @param workloadId for the ado connection
   * @param fields - limit to improve performance
   *
   * https://{{coreServer}}/{{organization}}/{{project}}/{{team}}/_apis/wit/wiql?api-version={{api-version}}&$top=100
   */
  fetchAllIssueRefsViaAPI = async (rawWiql: string, workloadId: string, fields: string[] = []) => {
    const serverConfig = this.configManager.getServerConfig(TicketManagementTypes.AZURE, workloadId);
    const wiql = serverConfig.filter ? `${rawWiql} ${serverConfig.filter}` : rawWiql;
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    const issueApi: IWorkItemTrackingApi = await this.getConnection(workloadId).getWorkItemTrackingApi();

    let allIssues = [];
    let resultTotal = -1;

    while (resultTotal === -1 || allIssues.length < resultTotal) {
      const query = `Select ${fields.join(", ")} ${wiql}`;
      verbose(`Querying Azure for work items created for ${workloadId} with WIQL: ${query}`);

      const queryRes: WorkItemQueryResult = await limitConcurrencyAndRetry(
        limiter,
        async () => issueApi.queryByWiql(
          { query },
          { project: ticketManagement.projectName, team: ticketManagement.team },
          true,
        ),
      );

      resultTotal += queryRes.workItems.length;
      allIssues = [...allIssues, ...queryRes.workItems];
      if (!queryRes?.workItems.length) {
        logger(`No work items returned from query to ADO with WIQL: ${query}`);
        break;
      }
      logger(`${allIssues.length} work item issues retrieved from Azure`);
    }

    return allIssues;
  };

  /**
   * Returns the detailed information for a batch of ADO work items
   * @param issueIds ado work item issue ids as array - max 200 per call
   * @param workloadId for the ado connection
   * @param fields limit response for performance
   * @returns raw ado work item objects
   */
  fetchIssuesDetailsViaAPI = async (issueIds: number[], workloadId: WorkloadId, fields: string[] = []) => {
    const issueApi: IWorkItemTrackingApi = await this.getConnection(workloadId).getWorkItemTrackingApi();
    const workItemRes: WorkItem[] = [];
    for (let i = 0; i < issueIds.length; i += MAX_RESULTS_PER_QUERY) {
      const idBatch = issueIds.slice(i, i + MAX_RESULTS_PER_QUERY);
      const workItemBatch = await limitConcurrencyAndRetry(
        limiter,
        async () => issueApi.getWorkItems(idBatch, fields),
      );
      if (workItemBatch) workItemRes.push(...workItemBatch);
    }
    return workItemRes || [];
  };

  fetchMappedIssuesDetails = async (issueIds: number[], workloadId: WorkloadId, fields: string[] = []) =>
    (await this.fetchIssuesDetailsViaAPI(issueIds, workloadId, fields)).map((wi) =>
      this.mapLightweightIssue(wi, workloadId),
    );

  fetchIssues = async (workload: Workload, wiql: string): Promise<LightweightIssue[]> => {
    const issues: LightweightIssue[] = [];
    const workloadIssues = await this.fetchAllIssuesAndMap<LightweightIssue>(
      wiql,
      workload.id,
      [
        "System.Id",
        "System.Title",
        "System.State",
        "System.WorkItemType",
        "System.CreatedDate",
        "Microsoft.VSTS.Common.ResolvedDate",
        "Microsoft.VSTS.Common.Priority",
      ],
      (issue) => {
        return this.mapLightweightIssue(issue, workload.id);
      },
    );
    issues.push(...workloadIssues);
    return issues;
  };

  fetchAllIssuesAndMap = async <T>(
    wiql: string,
    workloadId: string,
    fields: string[],
    mapFn: (issue) => T,
  ): Promise<T[]> => {
    logger(`Fetching Work Item issues from workload ${workloadId}...`);
    try {
      const allIssuesRefs = await this.fetchAllIssueRefsViaAPI(
        wiql,
        workloadId,
        fields.map((f) => `[${f}]`),
      );
      logger(`${allIssuesRefs.length} total Work Items retrieved`);
      const allIssuesDetails = await this.fetchIssuesDetailsViaAPI(
        allIssuesRefs.map((i) => i.id),
        workloadId,
        fields,
      );
      return allIssuesDetails.map(mapFn);
    } catch (err) {
      throw new Error(`Azure DevOps error with WIQL: ${wiql} - error: ${err}`);
    }
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

  mapLightweightIssue = (issue: WorkItem, workloadId: string): LightweightIssue => {
    return {
      key: `${issue.id}`,
      issueType: issue.fields["System.WorkItemType"],
      created: issue.fields["System.CreatedDate"],
      resolutiondate: issue.fields["Microsoft.VSTS.Common.ResolvedDate"],
      priority: issue.fields["Microsoft.VSTS.Common.Priority"],
      title: issue.fields["System.Title"],
      workload: workloadId,
    };
  };

  mapPriority = (priorityStr: string): number => {
    switch (priorityStr) {
      case "Lowest":
        return 0;
      case "Low":
        return 1;
      case "Medium":
        return 2;
      case "High":
        return 3;
      case "Highest":
        return 4;
      default:
        return -1;
    }
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

  matchTicketId(message: string): string | null {
    const matcher: RegExpMatchArray = message?.match(ISSUE_PATTERN);
    return matcher ? matcher[0] : null;
  }

  buildTicketLink = (workloadId: WorkloadId, issueId: string): string => {
    const ticketManagement = this.configManager.getWorkloadConfig(workloadId);
    return `${getAllIssueManagementUrls()[workloadId]}/${ticketManagement.projectName}/_workitems/edit/${issueId}`;
  };
}
